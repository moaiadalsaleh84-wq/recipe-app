import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/Text';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { MascotSays } from '../components/mascot/MascotSays';
import type { Line } from '../components/mascot/lines';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { PressableScale } from '../components/PressableScale';
import { useToast } from '../components/Toast';
import { Button, DrawnCheck } from '../components/ui';
import { haptics } from '../lib/haptics';
import {
  draftFromFailure,
  draftFromImport,
  EXAMPLE_URL,
  importIsConfigured,
  importPreview,
  importRecipe,
  isTikTokLink,
  missingMessage,
  phoneOembed,
  toRecipe,
  withPhoneDetails,
  type PhoneOembed,
  type ImportFailure,
  type ImportPreview,
  type ImportSuccess,
} from '../lib/importApi';
import { saveImportedPicture } from '../lib/photos';
import { showPaywall, useProGate } from '../lib/pro';
import { isIOS } from '../navigation/screenOptions';
import { FREE_LIMITS, useStore } from '../state/store';
import { useTheme } from '../theme';
import { Lift } from '../components/pop/Lift';
import { noWidow } from '../lib/text';

type Phase = { name: 'input' } | { name: 'loading' } | { name: 'failed'; failure: ImportFailure };

/** The three things the loading screen ticks off, in order. */
const STAGES = ['Reading the recipe', 'Finding ingredients', 'Writing the steps'] as const;
/** How long one line takes to be crossed off before the next one starts (strike 300 ms + a beat). */
const LINE_MS = 450;

const isLinkText = (value: string) => /^(https?:\/\/|www\.)\S+$/i.test(value) || (/https?:\/\//i.test(value) && value.length < 400);

/** "Import this TikTok?" / "Import this YouTube video?" / "Import this recipe from bbcgoodfood.com?" */
function offerFor(text: string | null) {
  const m = text?.match(/https?:\/\/[^\s]+/i);
  if (!m) return 'Import the link you copied?';
  try {
    const host = new URL(m[0]).hostname.replace(/^www\.|^m\./, '');
    if (/(^|\.)tiktok\.com$/.test(host)) return 'Import this TikTok?';
    if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return 'Import this YouTube video?';
    if (/(^|\.)instagram\.com$/.test(host)) return 'Import this Instagram post?';
    return `Import this recipe from ${host}?`;
  } catch {
    return 'Import the link you copied?';
  }
}

/**
 * Paste or share a link → a few seconds → the finished recipe, ready to cook. The server reads the
 * source and writes the recipe; this screen shows the picture right away while it works, then
 * opens the recipe page. What you pasted is never lost.
 */
export default function ImportScreen() {
  const t = useTheme();
  const toast = useToast();
  const params = useLocalSearchParams<{ url?: string; from?: string; auto?: string }>();
  const fromOnboarding = params.from === 'onboarding';
  const { addRecipe, countImport, setDraft, importsUsed } = useStore();
  const { canImport, importsLeft } = useProGate();
  const [input, setInput] = useState(typeof params.url === 'string' ? params.url : '');
  const [phase, setPhase] = useState<Phase>({ name: 'input' });
  const [helpOpen, setHelpOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [stage, setStage] = useState(0);
  // What the to-do lines show: follows `stage` one line at a time, so each line is crossed out
  // before the next one starts.
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  const lastLineAt = useRef(0);
  useEffect(() => {
    shownRef.current = shown;
    if (stage <= shown) return;
    const id = setTimeout(
      () => {
        lastLineAt.current = Date.now();
        setShown((s) => Math.min(stage, s + 1));
      },
      Math.max(0, lastLineAt.current + LINE_MS - Date.now()),
    );
    return () => clearTimeout(id);
  }, [stage, shown]);
  // A link on the clipboard: offered as one tap ("Import this TikTok?").
  const [offer, setOffer] = useState<{ label: string; text: string | null } | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  // Look for a copied link. On iPhone, only whether there is one (reading it would ask for
  // permission): the text is read when the offer is tapped. Elsewhere it can be read right away.
  useEffect(() => {
    if (input.trim() || params.auto === '1') return;
    let alive = true;
    (async () => {
      try {
        if (Platform.OS === 'ios') {
          if (await Clipboard.hasUrlAsync()) alive && setOffer({ label: 'Import the link you copied?', text: null });
          return;
        }
        const text = (await Clipboard.getStringAsync()).trim();
        if (alive && text && isLinkText(text)) setOffer({ label: offerFor(text), text });
      } catch {
        // No clipboard access: the Paste button still works.
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const save = async (result: ImportSuccess) => {
    const recipe = toRecipe(result.recipe, result.source);
    // Covers are web links that can expire (TikTok's do within hours): download once and keep the
    // original plus card and thumbnail crops. No picture (none, offline, broken): the recipe is
    // still saved, with the tinted placeholder.
    const picture = await saveImportedPicture(result.recipe.imageUrl);
    recipe.image = picture ? { uri: picture.card } : null;
    if (picture) recipe.importedImage = picture;
    const id = addRecipe(recipe);
    haptics.success();
    finish(id);
  };

  const run = async (override?: string) => {
    const value = (override ?? input).trim();
    if (!value) return;
    if (override !== undefined) setInput(value);
    // The built-in example is free: it never counts towards the free imports.
    const isExample = value === EXAMPLE_URL;
    if (!canImport && !isExample) {
      showPaywall('imports');
      return;
    }
    const isLink = isLinkText(value);
    setOffer(null);
    setPreview(null);
    setPreviewFailed(false);
    setStage(0);
    setShown(0);
    lastLineAt.current = 0;
    setPhase({ name: 'loading' });
    abort.current = new AbortController();
    const signal = abort.current.signal;
    // TikTok often refuses its details to our server but not to the phone: when the server has no
    // picture or creator, the app asks TikTok itself (once per import).
    let phone: Promise<PhoneOembed | null> | null = null;
    const askPhone = (link: string) => (phone ??= phoneOembed(link, signal));
    // The picture and creator come first (a second or two); the recipe follows.
    if (isLink) {
      void importPreview(value, signal).then((p) => {
        if (signal.aborted) return;
        if (p) setPreview(p);
        setStage((s) => Math.max(s, 1));
        if (isTikTokLink(p?.sourceUrl ?? value) && (!p?.imageUrl || !p.credit?.handle)) {
          void askPhone(p?.sourceUrl ?? value).then((ph) => {
            if (signal.aborted || !ph) return;
            // The thumbnail shows as soon as the phone has it.
            setPreview((cur) => ({
              kind: 'tiktok',
              sourceUrl: cur?.sourceUrl ?? ph.sourceUrl,
              title: cur?.title ?? null,
              imageUrl: cur?.imageUrl ?? ph.imageUrl,
              credit: cur?.credit?.handle ? cur.credit : ph.credit,
            }));
          });
        }
      });
    }
    let res = await importRecipe(isLink ? { url: value } : { text: value }, signal);
    if (res.ok && res.source.kind === 'tiktok' && (!res.recipe.imageUrl || !res.source.credit?.handle)) {
      res = withPhoneDetails(res, await askPhone(res.recipe.sourceUrl ?? value));
    }
    if (res.ok) {
      if (!isExample) countImport();
      // Nothing to cook from without ingredients: finish it in the form instead.
      if (res.recipe.ingredients.length === 0) {
        openForm(draftFromImport(res.recipe, [missingMessage(res.missing), ...res.warnings].filter(Boolean).join(' '), res.source));
        return;
      }
      // Cross off the remaining lines one by one, then open the finished recipe.
      setStage(3);
      await new Promise((r) => setTimeout(r, (3 - shownRef.current) * LINE_MS + 250));
      await save(res);
    } else if (res.code === 'cancelled') {
      setPhase({ name: 'input' });
    } else {
      haptics.warning();
      setPhase({ name: 'failed', failure: res });
    }
  };

  // A link shared to the app or pasted on Home starts reading right away (once).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (params.auto !== '1' || autoStarted.current || !input.trim()) return;
    autoStarted.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takeOffer = async () => {
    try {
      const text = offer?.text ?? (await Clipboard.getUrlAsync()) ?? (await Clipboard.getStringAsync());
      if (text?.trim()) void run(text.trim());
      else setOffer(null);
    } catch {
      setOffer(null);
      toast({ message: 'Couldn’t read the clipboard. Long-press the box to paste.', tone: 'warning' });
    }
  };

  const line: Line =
    phase.name === 'loading'
      ? { text: 'Ooh, let me read this one…', mood: 'thinking' }
      : phase.name === 'failed'
        ? { text: 'Oops, that one slipped away!', mood: 'oops' }
        : { text: 'Paste a link. I’ll fetch the recipe!', mood: 'excited' };
  const failure = phase.name === 'failed' ? phase.failure : null;
  const network = !!failure && ['offline', 'timeout', 'server_error', 'fetch_failed', 'ai_unavailable'].includes(failure.code);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader
        title="Import recipe"
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
        {phase.name !== 'loading' && <MascotSays line={line} size={96} style={{ marginBottom: 16 }} />}

        {phase.name === 'input' && (
          <Animated.View entering={FadeIn.duration(200)}>
            {fromOnboarding && (
              <Text style={[t.type.body, { color: t.colors.secondaryLabel, marginBottom: 12 }]}>
                Got a recipe saved somewhere? A TikTok, a YouTube video or a food blog? Paste the link and see it turn into a recipe you can cook from.
              </Text>
            )}
            {!importIsConfigured() && input.trim() !== EXAMPLE_URL && (
              <View style={[styles.notice, { backgroundColor: t.colors.cell, borderColor: t.colors.warning }]} testID="import-not-configured">
                <Icon name="warning" size={18} color={t.colors.warning} />
                <Text style={[t.type.footnote, { color: t.colors.label, flex: 1 }]}>Import isn’t connected in this build yet, so trying it will show an error. You can still write recipes yourself.</Text>
              </View>
            )}
            {offer && !input.trim() && (
              <Lift radius={18} style={{ marginBottom: 14 }}>
                <View style={[styles.offer, { backgroundColor: t.pop.sunshineTint, borderColor: t.pop.ink }]} testID="clipboard-offer">
                  <Icon name="paste" size={20} color={t.pop.ink} />
                  <Text style={[t.type.headline, { color: t.pop.ink, flex: 1 }]}>{offer.label}</Text>
                  <Button label="Import" size="medium" onPress={takeOffer} accessibilityLabel={offer.label} />
                </View>
              </Lift>
            )}
            <View style={[styles.inputWrap, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
              <TextInput maxFontSizeMultiplier={1.3}
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
                  <Icon name="paste" size={15} color={t.colors.tint} />
                  <Text style={[t.type.subhead, { color: t.colors.tint, fontFamily: t.fonts.display, fontWeight: 'normal' }]}>Paste</Text>
                </PressableScale>
              </View>
            </View>
            {/* One line of help; the details open on tap. */}
            <View style={styles.helpRow}>
              <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, flex: 1 }]}>{noWidow('TikTok, YouTube, Instagram and recipe websites.')}</Text>
              <PressableScale onPress={() => setHelpOpen((v) => !v)} accessibilityLabel="What works?" aria-expanded={helpOpen} style={styles.helpLink}>
                <Text style={[t.type.footnote, { color: t.colors.tint, fontFamily: t.fonts.bold }]}>What works?</Text>
              </PressableScale>
            </View>
            {helpOpen && (
              <Animated.View entering={FadeIn.duration(180)} style={[styles.help, { backgroundColor: t.colors.fill }]} testID="import-help">
                <Text style={[t.type.footnote, { color: t.colors.label, lineHeight: 19 }]}>
                  We read the caption, the video description or the page, never the video itself. When something isn’t written there (an amount, the steps, the time), we suggest it and mark it “est.”, so check it before cooking.
                </Text>
              </Animated.View>
            )}
            <Button label="Import recipe" icon="arrowRight" onPress={() => run()} disabled={!input.trim()} style={{ marginTop: 16 }} />
            {/* Shown once you've used one, not before. */}
            {importsLeft !== null && importsUsed > 0 && (
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
          <Animated.View entering={FadeIn.duration(200)} accessibilityLiveRegion="polite" testID="import-loading">
            {/* The picture as soon as we have it; the tinted card until then. */}
            <Lift radius={22}>
              <View style={[styles.loadPhoto, { backgroundColor: t.pop.tomatoTint, borderColor: t.pop.ink }]}>
                {preview?.imageUrl && !previewFailed ? (
                  <Image source={{ uri: preview.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} onError={() => setPreviewFailed(true)} accessibilityIgnoresInvertColors testID="loading-thumb" />
                ) : (
                  <Icon name="pot" size={56} color={t.pop.inkMuted} />
                )}
              </View>
            </Lift>
            {preview?.credit?.handle || preview?.credit?.siteName ? (
              <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, marginTop: 10 }]} numberOfLines={1} testID="loading-credit">
                {preview.credit.handle ? `From ${preview.credit.handle} on ${preview.kind === 'youtube' ? 'YouTube' : preview.kind === 'tiktok' ? 'TikTok' : (preview.credit.siteName ?? 'the web')}` : `From ${preview.credit.siteName}`}
              </Text>
            ) : null}
            <View style={styles.stages}>
              {STAGES.map((label, k) => (
                <StageLine key={label} label={label} index={k} state={shown > k ? 'done' : shown === k ? 'active' : 'todo'} />
              ))}
            </View>
            <Button label="Cancel" variant="plain" size="medium" onPress={() => abort.current?.abort()} style={{ marginTop: 12, alignSelf: 'center' }} accessibilityLabel="Cancel import" />
          </Animated.View>
        )}

        {failure && (
          <Animated.View entering={FadeIn.duration(200)} testID="import-failed">
            <Lift radius={18}>
              <View style={[styles.card, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
                <Text style={[t.type.headline, { color: t.colors.label }]}>{failureTitle(failure)}</Text>
                <Text style={[t.type.body, { color: t.colors.secondaryLabel, marginTop: 4 }]} testID="import-error">
                  {failure.message}
                </Text>
              </View>
            </Lift>
            <View style={{ gap: 10, marginTop: 16 }}>
              {/* A network problem: try the same link again. */}
              {network && <Button label="Try again" icon="restart" onPress={() => run()} />}
              {/* No recipe found: write it yourself, with the title, photo and link already filled in. */}
              {!network && failure.code !== 'rate_limited' && failure.code !== 'daily_cap' && (
                <Button label="Type it yourself" icon="edit" onPress={() => openForm(draftFromFailure(failure, input))} />
              )}
              {network && <Button label="Type it yourself" icon="edit" variant="tinted" onPress={() => openForm(draftFromFailure(failure, input))} />}
              <Button label="Back" variant="plain" onPress={() => setPhase({ name: 'input' })} accessibilityLabel="Back to the link" />
            </View>
          </Animated.View>
        )}
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

/**
 * One line of the loading to-do list. The current line's text pulses gently; when it's done a line
 * is drawn through it from left to right (300 ms), the text fades to muted and a check fades in on
 * the left. With Reduce Motion there's no pulse and the strike simply appears.
 */
function StageLine({ label, index, state }: { label: string; index: number; state: 'todo' | 'active' | 'done' }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const strike = useSharedValue(state === 'done' ? 1 : 0);

  useEffect(() => {
    if (state === 'active' && !reduceMotion) {
      // Starts once the line above has been crossed off.
      pulse.set(withDelay(index === 0 ? 0 : 300, withRepeat(withTiming(0.5, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true)));
    } else {
      cancelAnimation(pulse);
      pulse.set(state === 'active' || reduceMotion ? 1 : withTiming(1, { duration: 150 }));
    }
    if (state === 'done') strike.set(reduceMotion ? 1 : withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }));
    else strike.set(0);
  }, [state, reduceMotion, pulse, strike, index]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: pulse.get(),
    color: interpolateColor(strike.get(), [0, 1], [t.colors.label, t.colors.secondaryLabel]),
  }));
  const lineStyle = useAnimatedStyle(() => ({ width: `${strike.get() * 100}%` }));

  return (
    <View style={styles.stage} testID={`stage-${index}`} accessibilityLabel={`${label}${state === 'done' ? ', done' : state === 'active' ? ', working' : ''}`}>
      <View style={[styles.stageDot, { borderColor: state === 'todo' ? t.colors.secondaryLabel : t.pop.ink }]}>
        {state === 'done' && (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(150)} style={[styles.stageDotFill, { backgroundColor: t.pop.leaf }]} testID={`stage-${index}-check`}>
            <DrawnCheck size={16} delay={reduceMotion ? 0 : 100} />
          </Animated.View>
        )}
      </View>
      <View style={styles.stageText}>
        <Animated.Text style={[t.type.headline, { color: state === 'todo' ? t.colors.secondaryLabel : t.colors.label }, state !== 'todo' && textStyle]}>{label}</Animated.Text>
        <Animated.View style={[styles.strike, { backgroundColor: t.colors.secondaryLabel }, lineStyle]} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  helpRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  helpLink: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  help: { borderRadius: 16, padding: 12, borderCurve: 'continuous' },
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
  lifted: {},
  offer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingLeft: 16, borderRadius: 18, borderWidth: 2.5, borderCurve: 'continuous' },
  loadPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: 22, borderWidth: 2.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  stages: { gap: 14, marginTop: 20, alignSelf: 'stretch' },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  stageDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stageDotFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  stageText: { justifyContent: 'center', alignSelf: 'center' },
  strike: { position: 'absolute', left: 0, top: '52%', height: 2, borderRadius: 1 },
  h: { marginTop: 22, marginBottom: 8 },
});
