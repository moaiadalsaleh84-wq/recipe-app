import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CatSays } from '../components/cats/CatSays';
import type { Line } from '../components/cats/dialogue';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { PressableScale } from '../components/PressableScale';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { haptics } from '../lib/haptics';
import {
  draftFromFailure,
  draftFromImport,
  importIsConfigured,
  importRecipe,
  ingredientLine,
  missingMessage,
  sourceLabel,
  toRecipe,
  type ImportFailure,
  type ImportSuccess,
} from '../lib/importApi';
import { showPaywall, useProGate } from '../lib/pro';
import { isIOS } from '../navigation/screenOptions';
import { FREE_LIMITS, useBuddy, useStore } from '../state/store';
import { useTheme } from '../theme';

type Phase = { name: 'input' } | { name: 'loading' } | { name: 'failed'; failure: ImportFailure } | { name: 'review'; result: ImportSuccess };

/** Paste a link or a caption, the server reads it, you check it, you save it. */
export default function ImportScreen() {
  const t = useTheme();
  const toast = useToast();
  const buddy = useBuddy();
  const params = useLocalSearchParams<{ url?: string; from?: string }>();
  const fromOnboarding = params.from === 'onboarding';
  const { addRecipe, countImport, setDraft } = useStore();
  const { canImport, importsLeft } = useProGate();
  const [input, setInput] = useState(typeof params.url === 'string' ? params.url : '');
  const [phase, setPhase] = useState<Phase>({ name: 'input' });
  const [elapsed, setElapsed] = useState(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (phase.name !== 'loading') return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase.name]);

  useEffect(() => () => abort.current?.abort(), []);

  /** Where to go when this flow is over. */
  const finish = (recipeId?: string) => {
    if (fromOnboarding) router.replace({ pathname: '/paywall', params: { source: 'onboarding' } });
    else if (recipeId) router.replace({ pathname: '/recipe/[id]', params: { id: recipeId } });
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const openForm = (draft: ReturnType<typeof draftFromImport>) => {
    setDraft(draft);
    router.replace({ pathname: '/recipe/new', params: { draft: '1', ...(fromOnboarding ? { next: 'onboarding' } : {}) } });
  };

  const paste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text.trim()) {
        setInput(text.trim());
        haptics.select();
      } else toast({ message: 'Your clipboard is empty', tone: 'info' });
    } catch {
      toast({ message: 'Couldn’t read the clipboard. Long-press the box to paste.', tone: 'warning' });
    }
  };

  const run = async () => {
    const value = input.trim();
    if (!value) return;
    if (!canImport) {
      showPaywall('imports');
      return;
    }
    const isLink = /^(https?:\/\/|www\.)\S+$/i.test(value) || (/https?:\/\//i.test(value) && value.length < 400);
    setElapsed(0);
    setPhase({ name: 'loading' });
    abort.current = new AbortController();
    const res = await importRecipe(isLink ? { url: value } : { text: value }, abort.current.signal);
    if (res.ok) {
      countImport();
      haptics.success();
      if (res.status === 'partial') {
        openForm(draftFromImport(res.recipe, [missingMessage(res.missing), ...res.warnings].filter(Boolean).join(' ')));
        return;
      }
      setPhase({ name: 'review', result: res });
    } else if (res.code === 'cancelled') {
      setPhase({ name: 'input' });
    } else {
      haptics.warning();
      setPhase({ name: 'failed', failure: res });
    }
  };

  const save = (result: ImportSuccess) => {
    const id = addRecipe(toRecipe(result.recipe));
    toast({ message: `${result.recipe.title} saved to your recipes`, icon: 'book' });
    finish(id);
  };

  const line: Line =
    phase.name === 'loading'
      ? { text: buddy === 'tank' ? 'Reading the playbook. Stay with me.' : 'Ooh, let me read this one…', mood: 'think' }
      : phase.name === 'failed'
        ? { text: buddy === 'tank' ? 'That one fought back. Here’s what we can do.' : 'Oops, that one slipped out of my paws!', mood: 'worried' }
        : phase.name === 'review'
          ? { text: buddy === 'tank' ? 'Got it. Check the details, then lock it in.' : 'Got it! Have a look before we save it.', mood: 'happy' }
          : { text: buddy === 'tank' ? 'Drop a link. I’ll pull the recipe out.' : 'Paste a link and I’ll fetch the recipe for you!', mood: 'wave' };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader
        title={fromOnboarding ? 'Your first recipe' : 'Import recipe'}
        mode={fromOnboarding ? 'none' : 'cancel'}
        inSheet={isIOS && !fromOnboarding}
        onBack={() => {
          abort.current?.abort();
          finish();
        }}
        right={
          fromOnboarding ? (
            <PressableScale onPress={() => finish()} style={styles.headerBtn} accessibilityLabel="Skip for now">
              <Text style={[t.type.body, { color: t.colors.tint }]}>Skip</Text>
            </PressableScale>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CatSays buddy={buddy} line={line} size={96} style={{ marginBottom: 16 }} />

        {phase.name === 'input' && (
          <Animated.View entering={FadeIn.duration(200)}>
            {fromOnboarding && (
              <Text style={[t.type.body, { color: t.colors.secondaryLabel, marginBottom: 12 }]}>
                Got a recipe saved somewhere? A TikTok, a YouTube video or a food blog? Paste the link and see it turn into a recipe you can cook from.
              </Text>
            )}
            {!importIsConfigured() && (
              <View style={[styles.notice, { backgroundColor: t.colors.cell, borderColor: t.colors.warning }]} testID="import-not-configured">
                <Icon name="warning" size={18} color={t.colors.warning} />
                <Text style={[t.type.footnote, { color: t.colors.label, flex: 1 }]}>Import isn’t connected in this build yet, so trying it will show an error. You can still write recipes yourself.</Text>
              </View>
            )}
            <View style={[styles.inputWrap, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Paste a link, or the recipe text itself"
                placeholderTextColor={t.colors.tertiaryLabel}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Link or recipe text"
                style={[t.type.body, styles.input, { color: t.colors.label }]}
              />
              <View style={styles.inputActions}>
                {input ? (
                  <PressableScale onPress={() => setInput('')} accessibilityLabel="Clear" style={styles.smallBtn}>
                    <Text style={[t.type.subhead, { color: t.colors.secondaryLabel }]}>Clear</Text>
                  </PressableScale>
                ) : null}
                <PressableScale onPress={paste} accessibilityLabel="Paste from clipboard" style={[styles.smallBtn, { backgroundColor: t.colors.tintSoft }]}>
                  <Icon name="notes" size={15} color={t.colors.tint} />
                  <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '700' }]}>Paste</Text>
                </PressableScale>
              </View>
            </View>
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, marginTop: 10, lineHeight: 19 }]}>
              Works with recipe websites, and with TikTok, YouTube and Instagram when the recipe is written in the caption or description. We can’t watch videos, so a video without the recipe in its text can’t be imported.
            </Text>
            <Button label="Import recipe" icon="arrowRight" onPress={run} disabled={!input.trim()} style={{ marginTop: 18 }} />
            {importsLeft !== null && (
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 10 }]} testID="imports-left">
                {importsLeft > 0 ? `${importsLeft} of ${FREE_LIMITS.imports} free imports left` : `You’ve used your ${FREE_LIMITS.imports} free imports. Pro imports without limits.`}
              </Text>
            )}
            <PressableScale onPress={() => router.push('/privacy')} accessibilityLabel="What is sent when you import" style={styles.link}>
              <Text style={[t.type.footnote, { color: t.colors.tint }]}>What’s sent when you import?</Text>
            </PressableScale>
          </Animated.View>
        )}

        {phase.name === 'loading' && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.center} accessibilityLiveRegion="polite" testID="import-loading">
            <Text style={[t.type.headline, { color: t.colors.label }]}>Reading the recipe…</Text>
            <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center' }]}>This usually takes 5 to 30 seconds. {elapsed > 3 ? `(${elapsed} s)` : ''}</Text>
            <Button label="Cancel" variant="tinted" size="medium" onPress={() => abort.current?.abort()} style={{ marginTop: 16, alignSelf: 'center' }} accessibilityLabel="Cancel import" />
          </Animated.View>
        )}

        {phase.name === 'failed' && (
          <Animated.View entering={FadeIn.duration(200)} testID="import-failed">
            <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
              <Text style={[t.type.headline, { color: t.colors.label }]}>{failureTitle(phase.failure)}</Text>
              <Text style={[t.type.body, { color: t.colors.secondaryLabel, marginTop: 4 }]} testID="import-error">
                {phase.failure.message}
              </Text>
            </View>
            <View style={{ gap: 10, marginTop: 16 }}>
              {phase.failure.code === 'rate_limited' || phase.failure.code === 'daily_cap' ? null : (
                <Button label="Try again" icon="restart" onPress={run} />
              )}
              {(phase.failure.code === 'no_text' || phase.failure.code === 'blocked' || phase.failure.code === 'fetch_failed') && (
                <Button
                  label="Paste the text instead"
                  icon="notes"
                  variant="tinted"
                  onPress={() => {
                    setInput('');
                    setPhase({ name: 'input' });
                  }}
                />
              )}
              <Button label="Write it myself" icon="edit" variant="tinted" onPress={() => openForm(draftFromFailure(phase.failure, input))} />
              <Button label="Back" variant="plain" onPress={() => setPhase({ name: 'input' })} accessibilityLabel="Back to the link" />
            </View>
          </Animated.View>
        )}

        {phase.name === 'review' && <Review result={phase.result} onSave={() => save(phase.result)} onEdit={() => openForm(draftFromImport(phase.result.recipe, phase.result.warnings.join(' ') || null))} onDiscard={() => setPhase({ name: 'input' })} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function failureTitle(f: ImportFailure) {
  switch (f.code) {
    case 'no_text':
      return 'No recipe in the text';
    case 'blocked':
      return 'The site said no';
    case 'not_a_recipe':
      return 'That isn’t a recipe';
    case 'offline':
      return 'You’re offline';
    case 'rate_limited':
    case 'daily_cap':
      return 'Slow down a little';
    case 'invalid_input':
      return 'Check the link';
    default:
      return 'Import didn’t work';
  }
}

function Review({ result, onSave, onEdit, onDiscard }: { result: ImportSuccess; onSave: () => void; onEdit: () => void; onDiscard: () => void }) {
  const t = useTheme();
  const r = result.recipe;
  const n = r.nutrition;
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <Animated.View entering={FadeIn.duration(220)} testID="import-review">
      <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card, padding: 0, overflow: 'hidden' }]}>
        {r.imageUrl && !photoFailed ? <Image source={{ uri: r.imageUrl }} style={styles.photo} contentFit="cover" onError={() => setPhotoFailed(true)} accessibilityIgnoresInvertColors /> : null}
        <View style={{ padding: 16, gap: 4 }}>
          <Text style={[t.type.title2, { color: t.colors.label }]} testID="review-title">
            {r.title}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.secondaryLabel }]}>
            {[r.servings && `Serves ${r.servings}`, r.minutes && `${r.minutes} min`, `From ${result.source.host ?? sourceLabel[result.source.kind]}`].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      {result.warnings.length > 0 && (
        <View style={[styles.notice, { backgroundColor: t.colors.cell, borderColor: t.colors.warning, marginTop: 12 }]} testID="review-warnings">
          <Icon name="info" size={18} color={t.colors.warning} />
          <Text style={[t.type.footnote, { color: t.colors.label, flex: 1 }]}>{result.warnings.join(' ')}</Text>
        </View>
      )}

      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]}>Ingredients · {r.ingredients.length}</Text>
      <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
        {r.ingredients.map((i, k) => (
          <Text key={k} style={[t.type.body, { color: t.colors.label, paddingVertical: 4 }]}>
            • {ingredientLine(i)}
          </Text>
        ))}
      </View>

      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]}>Steps · {r.steps.length}</Text>
      <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card, gap: 10 }]}>
        {r.steps.map((s, k) => (
          <Text key={k} style={[t.type.body, { color: t.colors.label }]}>
            <Text style={{ fontWeight: '700', color: t.colors.tint }}>{k + 1}. </Text>
            {s}
          </Text>
        ))}
      </View>

      <Text style={[t.type.title3, styles.h, { color: t.colors.label }]}>Nutrition</Text>
      <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]} testID="review-nutrition">
        {n ? (
          <>
            <Text style={[t.type.body, { color: t.colors.label }]}>
              {n.calories} kcal · {n.protein} g protein · {n.carbs} g carbs · {n.fat} g fat
            </Text>
            <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, marginTop: 4 }]}>
              Estimated per serving{n.basis === 'source' ? ', as given by the source' : ', worked out from the ingredients'}. Real values depend on brands and portions.
            </Text>
          </>
        ) : (
          <Text style={[t.type.body, { color: t.colors.secondaryLabel }]}>Not enough detail to estimate. You can add it when editing.</Text>
        )}
      </View>

      <View style={{ gap: 10, marginTop: 20 }}>
        <Button label="Save recipe" icon="check" onPress={onSave} accessibilityLabel="Save imported recipe" />
        <Button label="Edit before saving" icon="edit" variant="tinted" onPress={onEdit} />
        <Button label="Discard" variant="plain" onPress={onDiscard} accessibilityLabel="Discard import" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 640, alignSelf: 'center' },
  headerBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  inputWrap: { borderRadius: 18, padding: 12, borderCurve: 'continuous' },
  input: { minHeight: 110, textAlignVertical: 'top', outlineStyle: 'none' } as never,
  inputActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 14, borderWidth: 1.5, marginBottom: 12 },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, marginTop: 4 },
  center: { alignItems: 'center', gap: 6, paddingTop: 8 },
  card: { borderRadius: 18, padding: 16, borderCurve: 'continuous' },
  photo: { height: 200, width: '100%' },
  h: { marginTop: 22, marginBottom: 8 },
});
