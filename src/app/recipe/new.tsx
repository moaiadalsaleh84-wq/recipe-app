import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { CatSays } from '../../components/cats/CatSays';
import { say } from '../../components/cats/dialogue';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { PressableScale } from '../../components/PressableScale';
import { useToast } from '../../components/Toast';
import { Chip, Stepper } from '../../components/ui';
import { categories, dietTags, type Category, type DietTag } from '../../data/mock';
import { haptics } from '../../lib/haptics';
import { parseIngredient } from '../../lib/parseIngredient';
import { useBuddy, useStore } from '../../state/store';
import { useTheme } from '../../theme';

/** Write down your own recipe, or keep one you found online with a link to the original. */
export default function NewRecipe() {
  const t = useTheme();
  const toast = useToast();
  const buddy = useBuddy();
  const { addRecipe } = useStore();

  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('Dinner');
  const [minutes, setMinutes] = useState(30);
  const [servings, setServings] = useState(2);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [tags, setTags] = useState<DietTag[]>([]);

  const ingredients = ingredientsText.split('\n').map((l, i) => parseIngredient(l, i)).filter((x) => x !== null);
  const steps = stepsText.split('\n').map((s) => s.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean);
  const missing = [!title.trim() && 'a title', ingredients.length === 0 && 'ingredients', steps.length === 0 && 'steps'].filter(Boolean) as string[];
  const valid = missing.length === 0;

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!res.canceled && res.assets[0]) {
        setPhoto(res.assets[0].uri);
        haptics.success();
      }
    } catch {
      toast({ message: 'Couldn’t open your photos', tone: 'warning' });
    }
  };

  const save = () => {
    if (!valid) {
      toast({ message: `Add ${missing.join(', ')} to save`, tone: 'warning' });
      return;
    }
    const url = link.trim();
    const id = addRecipe({
      title: title.trim(),
      image: photo ? { uri: photo } : null,
      description: '',
      category,
      minutes,
      servings,
      calories: Number(calories) || 0,
      nutrition: { protein: Number(protein) || 0, carbs: 0, fat: 0 },
      difficulty: 'Easy',
      tags,
      ingredients,
      steps,
      sourceUrl: url ? (/^https?:\/\//i.test(url) ? url : `https://${url}`) : undefined,
    });
    toast({ message: `${title.trim()} saved to your recipes`, icon: 'book' });
    router.replace({ pathname: '/recipe/[id]', params: { id } });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.colors.groupedBackground }}>
      <PageHeader
        title="New Recipe"
        mode="cancel"
        inSheet={Platform.OS === 'ios'}
        right={
          <PressableScale onPress={save} style={styles.save} accessibilityLabel="Save recipe" aria-disabled={!valid}>
            <Text style={[t.type.headline, { color: valid ? t.colors.tint : t.colors.tertiaryLabel }]}>Save</Text>
          </PressableScale>
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <CatSays buddy={buddy} line={say(buddy, 'newRecipe')} size={86} style={{ marginBottom: 16 }} />

        <PressableScale
          onPress={pickPhoto}
          accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}
          style={[styles.photo, { backgroundColor: t.colors.cell, ...t.chunky.card }]}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <>
              <Icon name="camera" size={28} color={t.colors.tint} />
              <Text style={[t.type.subhead, { color: t.colors.tint, fontWeight: '700', fontFamily: t.fonts.rounded }]}>Add a photo</Text>
            </>
          )}
        </PressableScale>

        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Grandma’s lemon cake" returnKeyType="next" />
        <Field
          label="Link to the original (optional)"
          value={link}
          onChangeText={setLink}
          placeholder="Instagram, TikTok, a website…"
          autoCapitalize="none"
          keyboardType="url"
          hint="Keeps the source one tap away. You type the recipe below."
        />

        <Label text="Category" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <View style={[styles.row, { backgroundColor: t.colors.cell, ...t.chunky.card }]}>
          <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Minutes</Text>
          <Stepper value={minutes} onChange={setMinutes} min={5} max={600} label="minutes" />
        </View>
        <View style={[styles.row, { backgroundColor: t.colors.cell, ...t.chunky.card, marginTop: 10 }]}>
          <Text style={[t.type.body, { color: t.colors.label, flex: 1 }]}>Servings</Text>
          <Stepper value={servings} onChange={setServings} label="servings" />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Calories / serving" value={calories} onChangeText={(v) => setCalories(v.replace(/[^0-9]/g, ''))} placeholder="Optional" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Protein (g)" value={protein} onChangeText={(v) => setProtein(v.replace(/[^0-9]/g, ''))} placeholder="Optional" keyboardType="number-pad" />
          </View>
        </View>

        <Field
          label={`Ingredients${ingredients.length ? ` · ${ingredients.length}` : ''}`}
          value={ingredientsText}
          onChangeText={setIngredientsText}
          placeholder={'One per line, e.g.\n200 g flour\n2 eggs\n1 tbsp olive oil'}
          multiline
          hint="Amounts and units are picked up for scaling and your grocery list."
        />
        <Field
          label={`Steps${steps.length ? ` · ${steps.length}` : ''}`}
          value={stepsText}
          onChangeText={setStepsText}
          placeholder={'One step per line, e.g.\nWhisk the eggs and sugar.\nBake for 25 minutes.'}
          multiline
          hint="Times like “25 minutes” become timers in Cook Mode."
        />

        <Label text="Tags" />
        <View style={styles.tagWrap}>
          {dietTags.map((tag) => (
            <Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => setTags((p) => (p.includes(tag) ? p.filter((x) => x !== tag) : [...p, tag]))} />
          ))}
        </View>

        {!valid && <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 24 }]}>Add {missing.join(', ')} to save.</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={[t.type.footnote, { color: t.colors.secondaryLabel, fontWeight: '700', marginTop: 18, marginBottom: 6, marginLeft: 4 }]}>{text.toUpperCase()}</Text>;
}

function Field({ label, hint, multiline, ...props }: TextInputProps & { label: string; hint?: string }) {
  const t = useTheme();
  return (
    <View>
      <Label text={label} />
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={t.colors.tertiaryLabel}
        accessibilityLabel={label}
        style={[t.type.body, styles.input, multiline && styles.multiline, { color: t.colors.label, backgroundColor: t.colors.cell, ...t.chunky.card }]}
      />
      {hint && <Text style={[t.type.caption1, { color: t.colors.secondaryLabel, marginTop: 6, marginLeft: 4 }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 640, alignSelf: 'center' },
  save: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  photo: { height: 170, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden', borderCurve: 'continuous' },
  input: { minHeight: 50, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderCurve: 'continuous', outlineStyle: 'none' } as never,
  multiline: { minHeight: 130, textAlignVertical: 'top' },
  chips: { gap: 8, paddingVertical: 6, minHeight: 48, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, minHeight: 56, borderRadius: 16, marginTop: 18, borderCurve: 'continuous' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
