import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from '../../components/Text';
import { MascotSays } from '../../components/mascot/MascotSays';
import { say } from '../../components/mascot/lines';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { PressableScale } from '../../components/PressableScale';
import { useToast } from '../../components/Toast';
import { Button, Chip, Stepper } from '../../components/ui';
import { categories, dietTags, type Category, type DietTag } from '../../data/mock';
import { creditFields, nutritionExtras } from '../../lib/importApi';
import { haptics } from '../../lib/haptics';
import { parseIngredient } from '../../lib/parseIngredient';
import { pickPhoto as pickLibraryPhoto, saveImportedPicture } from '../../lib/photos';
import { showPaywall, useProGate } from '../../lib/pro';
import { useStore } from '../../state/store';
import { useTheme } from '../../theme';
import { Lift } from '../../components/pop/Lift';
import { PhotoFrame } from '../../components/PhotoFrame';

/** One ingredient in the form: amount, unit and name in their own fields. */
type Row = { key: string; amount: string; unit: string; name: string; note?: string; estimated?: boolean; id?: string };

let rowCounter = 0;
const newKey = () => `row-${Date.now().toString(36)}-${rowCounter++}`;

const fmtAmount = (q: number | null) => (q === null || q === 0 ? '' : String(Math.round(q * 100) / 100));

/** "200 g flour" (a form line) → a row. */
function rowFromLine(line: string): Row | null {
  const ing = parseIngredient(line, 0);
  if (!ing) return null;
  return { key: newKey(), amount: fmtAmount(ing.quantity), unit: ing.unit, name: ing.name, ...(ing.note ? { note: ing.note } : {}) };
}

/**
 * Write down your own recipe, finish an import, or edit one of your recipes (⋯ → Edit recipe).
 * One Save, at the bottom; when it can't save yet, it says why right above it.
 */
export default function NewRecipe() {
  const t = useTheme();
  const toast = useToast();
  const { addRecipe, updateRecipe, getRecipe, draft: storedDraft, setDraft, findBySource } = useStore();
  const { canAddRecipe } = useProGate();
  const params = useLocalSearchParams<{ draft?: string; next?: string; edit?: string }>();
  // Editing an existing recipe of yours, or finishing an import (pre-filled), or a blank one.
  const [editing] = useState(() => (params.edit ? getRecipe(params.edit) : undefined));
  const [draft] = useState(() => (params.draft === '1' ? storedDraft : null));

  const [title, setTitle] = useState(editing?.title ?? draft?.title ?? '');
  const [link, setLink] = useState(editing?.sourceUrl ?? draft?.link ?? '');
  const [photo, setPhoto] = useState<string | null>(editing ? (editing.image && typeof editing.image === 'object' ? editing.image.uri : null) : (draft?.photoUrl ?? null));
  const [category, setCategory] = useState<Category>(editing?.category ?? draft?.category ?? 'Dinner');
  const [minutes, setMinutes] = useState(editing?.minutes ?? draft?.minutes ?? 30);
  const [servings, setServings] = useState(editing?.servings ?? draft?.servings ?? 2);
  const [calories, setCalories] = useState(editing ? (editing.calories ? String(editing.calories) : '') : (draft?.calories ?? ''));
  const [protein, setProtein] = useState(editing ? (editing.nutrition.protein ? String(editing.nutrition.protein) : '') : (draft?.protein ?? ''));
  const [rows, setRows] = useState<Row[]>(() => {
    const start = editing
      ? editing.ingredients.map((i) => ({ key: newKey(), amount: fmtAmount(i.quantity), unit: i.quantity === null ? 'pinch' : i.unit, name: i.name, note: i.note, estimated: i.estimated, id: i.id }))
      : (draft?.ingredientsText ?? '').split('\n').map(rowFromLine).filter((r): r is Row => r !== null);
    return start.length ? start : [{ key: newKey(), amount: '', unit: '', name: '' }];
  });
  const [stepsText, setStepsText] = useState(editing ? editing.steps.join('\n') : (draft?.stepsText ?? ''));
  const [tags, setTags] = useState<DietTag[]>(editing ? (editing.tags.filter((x) => x !== 'Quick') as DietTag[]) : (draft?.tags ?? []));
  const fromImport = !!draft?.fromImport;

  // Rows → ingredients, read the same way as a typed line ("200 g flour").
  const ingredients = rows
    .map((r, i) => {
      if (!r.name.trim()) return null;
      // Without an amount the unit can't be read from the line ("pinch salt" would become the name).
      const amount = r.amount.trim();
      const ing = parseIngredient(amount ? [amount, r.unit.trim(), r.name.trim()].filter(Boolean).join(' ') : r.name.trim(), i);
      if (!ing) return null;
      // A row left as it was keeps its id (steps point at it), note and "est." mark.
      return { ...ing, ...(r.id ? { id: r.id } : {}), ...(r.note ? { note: r.note } : {}), ...(!amount && r.unit.toLowerCase() === 'pinch' ? { quantity: null, unit: 'pinch' } : {}), ...(r.estimated ? { estimated: true } : {}) };
    })
    .filter((x) => x !== null);
  const steps = stepsText.split('\n').map((x) => x.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean);
  const missing = [!title.trim() && 'a title', ingredients.length === 0 && 'ingredients', steps.length === 0 && 'steps'].filter(Boolean) as string[];
  // "a title, ingredients and steps", not "a title, ingredients, steps".
  const missingText = missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : (missing[0] ?? '');
  const valid = missing.length === 0;

  const setRow = (key: string, patch: Partial<Row>) =>
    // Changing a row means it's been checked: the "est." mark goes.
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, estimated: false } : r)));
  const addRow = () => setRows((rs) => [...rs, { key: newKey(), amount: '', unit: '', name: '' }]);
  const removeRow = (key: string) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [{ key: newKey(), amount: '', unit: '', name: '' }]));

  const pickPhoto = async () => {
    try {
      const uri = await pickLibraryPhoto();
      if (uri) {
        setPhoto(uri);
        haptics.success();
      }
    } catch {
      toast({ message: 'Couldn’t open your photos', tone: 'warning' });
    }
  };

  const save = async () => {
    // Imports have their own allowance (already counted); the free limit is for hand-written recipes.
    if (!editing && !fromImport && !canAddRecipe) {
      showPaywall('recipes');
      return;
    }
    if (!valid) return;
    const url = link.trim();
    const sourceUrl = url ? (/^https?:\/\//i.test(url) ? url : `https://${url}`) : undefined;
    // An import from a link that's already in your recipes: open that one, never a second copy.
    const already = fromImport && !editing ? findBySource(sourceUrl) : undefined;
    if (already) {
      toast({ message: 'You already saved this one. Here it is.', icon: 'bookmarkFill' });
      router.replace({ pathname: '/recipe/[id]', params: { id: already.id } });
      return;
    }

    if (editing) {
      // Steps left unchanged keep their timers, "est." marks and ingredient links (to ingredients still there).
      const ids = new Set(ingredients.map((i) => i.id));
      const stepMeta = editing.stepMeta
        ? steps.map((st) => {
            const k = editing.steps.indexOf(st);
            const m = k >= 0 ? editing.stepMeta?.[k] : undefined;
            return m ? { ...m, ingredientIds: m.ingredientIds.filter((id) => ids.has(id)) } : { ingredientIds: [], timerSeconds: null };
          })
        : undefined;
      const picked = photo && photo !== (editing.image && typeof editing.image === 'object' ? editing.image.uri : null);
      updateRecipe(editing.id, {
        title: title.trim(),
        category,
        minutes,
        servings,
        calories: Number(calories) || 0,
        nutrition: { ...editing.nutrition, protein: Number(protein) || 0 },
        tags: [...tags, ...(editing.tags.includes('Quick') ? (['Quick'] as const) : [])],
        ingredients,
        steps,
        ...(stepMeta ? { stepMeta } : {}),
        sourceUrl,
        ...(picked ? { image: { uri: photo! } } : {}),
        // Servings or time changed by hand: no longer estimated.
        ...(editing.estimated ? { estimated: { servings: !!editing.estimated.servings && servings === editing.servings, time: !!editing.estimated.time && minutes === editing.minutes } } : {}),
      });
      haptics.success();
      toast({ message: 'Recipe saved', icon: 'check' });
      router.back();
      return;
    }

    // An imported cover is a web link that may expire (TikTok's do): keep a copy on the phone, with
    // its card and thumbnail crops. If it can't be saved, the recipe keeps the tinted placeholder.
    const fromWeb = !!photo && /^https?:\/\//i.test(photo);
    const picture = fromWeb ? await saveImportedPicture(photo) : null;
    const image = fromWeb ? (picture?.card ?? null) : photo;
    const kept = draft?.importedNutrition;
    // Keep the imported carbs and fat unless the user changed the numbers they can see.
    const keepNutrition = kept && String(kept.calories) === calories && String(kept.protein) === protein;
    const id = addRecipe({
      title: title.trim(),
      image: image ? { uri: image } : null,
      description: '',
      category,
      minutes,
      servings,
      calories: Number(calories) || 0,
      nutrition: { protein: Number(protein) || 0, carbs: keepNutrition ? kept.carbs : 0, fat: keepNutrition ? kept.fat : 0 },
      ...(keepNutrition ? nutritionExtras(kept) : {}),
      difficulty: 'Easy',
      tags,
      ingredients,
      steps,
      sourceUrl,
      origin: fromImport ? 'import' : 'manual',
      // The creator credit stays with an imported recipe, always.
      ...(fromImport ? creditFields(draft?.origin, url) : {}),
      ...(picture ? { importedImage: picture } : {}),
    });
    setDraft(null);
    toast({ message: `${title.trim()} saved to your recipes`, icon: 'book' });
    if (params.next === 'onboarding') router.replace({ pathname: '/paywall', params: { source: 'onboarding' } });
    else router.replace({ pathname: '/recipe/[id]', params: { id } });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      {/* The top bar is solid and sits above the form, so nothing shows through it. */}
      <View style={[styles.top, { backgroundColor: t.colors.groupedBackground, borderBottomColor: t.colors.separator }]}>
        <PageHeader
          title={editing ? 'Edit recipe' : fromImport ? 'Check recipe' : 'New recipe'}
          mode="cancel"
          inSheet={Platform.OS === 'ios'}
          onBack={params.next === 'onboarding' ? () => router.replace({ pathname: '/paywall', params: { source: 'onboarding' } }) : undefined}
        />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        {draft?.notice ? (
          <View style={[styles.notice, { backgroundColor: t.colors.cell, borderColor: t.colors.warning }]} testID="draft-notice" accessibilityRole="alert">
            <Icon name="info" size={18} color={t.colors.warning} />
            <Text style={[t.type.subhead, { color: t.colors.label, flex: 1 }]}>{draft.notice}</Text>
          </View>
        ) : editing ? null : (
          <MascotSays line={say('newRecipe')} size={86} style={{ marginBottom: 16 }} />
        )}

        <Lift radius={20}>
          <PressableScale
            onPress={pickPhoto}
            accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}
            // With a photo, the PhotoFrame draws the ink border; the empty box keeps the card look.
            style={[styles.photo, !photo && { backgroundColor: t.colors.cell, ...t.chunky.card }]}
          >
            {photo ? (
              <PhotoFrame uri={photo} radius={20} onError={() => setPhoto(null)} style={StyleSheet.absoluteFill} />
            ) : (
              <>
                <Icon name="camera" size={28} color={t.colors.tint} />
                <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: 'normal', fontFamily: t.fonts.rounded }]}>Add a photo</Text>
              </>
            )}
          </PressableScale>
        </Lift>

        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Grandma’s lemon cake" returnKeyType="next" />
        <Field
          label="Link to the original (optional)"
          value={link}
          onChangeText={setLink}
          placeholder="TikTok, YouTube, a website…"
          autoCapitalize="none"
          keyboardType="url"
          hint="Keeps the source one tap away."
        />

        <Label text="Category" />
        {/* Wraps onto a second line instead of running off the screen. */}
        <View style={styles.chipWrap}>
          {categories.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <Lift radius={16} style={{ marginTop: 18 }}>
          <View style={[styles.row, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
            <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Minutes</Text>
            <Stepper value={minutes} onChange={setMinutes} min={5} max={600} label="minutes" />
          </View>
        </Lift>
        <Lift radius={16} style={{ marginTop: 10 }}>
          <View style={[styles.row, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
            <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Servings</Text>
            <Stepper value={servings} onChange={setServings} label="servings" />
          </View>
        </Lift>

        {/* Bottom-aligned, so the two boxes stay level even if a label wraps with large text. */}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field label="Kcal per serving" value={calories} onChangeText={(v) => setCalories(v.replace(/[^0-9]/g, ''))} placeholder="e.g. 550" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Protein (g)" value={protein} onChangeText={(v) => setProtein(v.replace(/[^0-9]/g, ''))} placeholder="e.g. 40" keyboardType="number-pad" />
          </View>
        </View>

        {/* Ingredients: one per row, amount · unit · name. */}
        <Label text={`Ingredients${ingredients.length ? ` · ${ingredients.length}` : ''}`} />
        <View style={{ gap: 8 }} testID="ingredient-rows">
          {rows.map((r, i) => (
            <View key={r.key} style={styles.ingRow}>
              <TextInput
                maxFontSizeMultiplier={1.3}
                value={r.amount}
                onChangeText={(v) => setRow(r.key, { amount: v.replace(/[^0-9.,/½¼¾⅓⅔ ]/g, '') })}
                placeholder="qty"
                keyboardType="decimal-pad"
                accessibilityLabel={`Ingredient ${i + 1} amount`}
                placeholderTextColor={t.colors.tertiaryLabel}
                style={[t.type.input, styles.input, styles.amount, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]}
              />
              <TextInput
                maxFontSizeMultiplier={1.3}
                value={r.unit}
                onChangeText={(v) => setRow(r.key, { unit: v.trim() })}
                placeholder="unit"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={`Ingredient ${i + 1} unit, like g, cup or tbsp`}
                placeholderTextColor={t.colors.tertiaryLabel}
                style={[t.type.input, styles.input, styles.unit, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]}
              />
              <TextInput
                maxFontSizeMultiplier={1.3}
                value={r.name}
                onChangeText={(v) => setRow(r.key, { name: v })}
                placeholder={i === 0 ? 'flour' : 'ingredient'}
                accessibilityLabel={`Ingredient ${i + 1} name`}
                placeholderTextColor={t.colors.tertiaryLabel}
                style={[t.type.input, styles.input, styles.name, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]}
              />
              <PressableScale onPress={() => removeRow(r.key)} accessibilityLabel={`Remove ingredient ${i + 1}`} style={styles.remove} hitSlop={6}>
                <Icon name="close" size={14} color={t.colors.secondaryLabel} weight="bold" />
              </PressableScale>
            </View>
          ))}
          <Button label="Add ingredient" icon="plus" variant="tinted" size="medium" onPress={addRow} style={{ alignSelf: 'flex-start' }} />
        </View>
        <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, marginTop: 6, marginLeft: 4 }]}>Amounts and units scale with servings and go to your grocery list.</Text>

        <Field
          label={`Steps${steps.length ? ` · ${steps.length}` : ''}`}
          value={stepsText}
          onChangeText={setStepsText}
          placeholder={'One step per line, e.g.\nWhisk the eggs and sugar.\nBake for 25 minutes.'}
          multiline
          hint="Times like “25 minutes” become timers in Cook Mode."
        />

        <Label text="Tags" />
        <View style={styles.chipWrap}>
          {dietTags.map((tag) => (
            <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => setTags((p) => (p.includes(tag) ? p.filter((x) => x !== tag) : [...p, tag]))} />
          ))}
        </View>

        {/* One Save. When it can't save yet, the reason sits right above it. */}
        {!valid && (
          <Text style={[t.type.subhead, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 24 }]} testID="save-reason">
            Add {missingText} to save.
          </Text>
        )}
        <Button label={editing ? 'Save changes' : 'Save recipe'} icon="check" onPress={save} disabled={!valid} style={{ marginTop: valid ? 28 : 10 }} accessibilityLabel={editing ? 'Save changes' : 'Save recipe'} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, fontFamily: t.fonts.display, fontWeight: 'normal', fontSize: 15, marginTop: 16, marginBottom: 8 }]}>{text}</Text>;
}

function Field({ label, hint, multiline, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  return (
    <View>
      <Label text={label} />
      <TextInput maxFontSizeMultiplier={1.3}
        {...props}
        multiline={multiline}
        placeholderTextColor={t.colors.tertiaryLabel}
        accessibilityLabel={label}
        style={[multiline ? t.type.body : t.type.input, styles.input, multiline && styles.multiline, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]}
      />
      {hint && <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, marginTop: 6, marginLeft: 4 }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 640, alignSelf: 'center' },
  top: { zIndex: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  scroll: { flex: 1, overflow: 'hidden' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amount: { width: 64, minHeight: 48, paddingHorizontal: 10, textAlign: 'center' },
  unit: { width: 70, minHeight: 48, paddingHorizontal: 10 },
  name: { flex: 1, minWidth: 0, minHeight: 48 },
  remove: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  photo: { height: 170, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden', borderCurve: 'continuous' },
  input: { minHeight: 50, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderCurve: 'continuous', outlineStyle: 'none' } as never,
  multiline: { minHeight: 130, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, minHeight: 56, borderRadius: 16, borderCurve: 'continuous' },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 16 },
});
