# Recipe photos to replace

Checked all 32 built-in recipe photos (`assets/recipes/`). Every one is 1600 × 1200, so none is too
small. These are the ones that look weak on a card or the new full-width recipe page, worst first.
Sharpness is the variance of the Laplacian on a 512 px copy (higher is sharper; most photos score
200 to 1,400).

| Recipe | Photo | What's wrong | Sharpness |
| --- | --- | --- | --- |
| Cottage Cheese Flatbread | `cottage-cheese-flatbread.webp` | The wraps are cut off at the top edge; beige on cream, little contrast; soft | 50 |
| Strawberry Cream Squares | `strawberry-cream-squares.webp` | A small square on a big white plate: mostly empty plate on a card; soft | 67 |
| Garlic Parmesan Smashed Potatoes | `garlic-parmesan-smashed-potatoes.webp` | Muddy yellow, crowded, soft focus | 134 |
| Baked Feta Pasta | `baked-feta-pasta.webp` | Shows raw tomatoes and a block of feta before baking (and a kettle), not the finished pasta | 135 |
| Protein Baked Oats | `protein-baked-oats.webp` | Pale slices on grey oats in a glass dish: not appetizing | 506 |
| Crispy Samosas | `crispy-samosas.webp` | Soft focus | 73 |
| Crispy Rice Salmon Bites | `crispy-rice-salmon-bites.webp` | Shows sushi rolls, not crispy rice squares with salmon | 632 |

To replace one: save a new photo over the same file name (landscape, at least 1600 × 1200), keep
the dish in the middle, and also update the `-square.webp` file next to it.

Imported and Discover recipes are handled in the app: new imports get a food-centred 4:5 crop,
and a picture that is too small to look sharp (shorter side under 360 px) shows the recipe's color
with the fox instead of a blurry, stretched image.
