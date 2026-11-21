/**
 * The recipe photos (all from Unsplash, see photoCredits.ts): a 4:3 crop for cards and a 1:1 crop for
 * thumbnails, both centred on the food, WebP under 300 KB, plus a blurhash shown while each loads.
 */
export type RecipePhotoSet = { card: number; square: number; blurhash: string; squareBlurhash: string };

export const recipePhotos: Record<string, RecipePhotoSet> = {
  'crispy-beef-tacos': {
    card: require('../../assets/recipes/crispy-beef-tacos.webp'),
    square: require('../../assets/recipes/crispy-beef-tacos-square.webp'),
    blurhash: 'LDIq_WcE5F-?_1%NNfIV0u8yD%x@',
    squareBlurhash: 'LDI}naF{K9=$~oxwE3xb0a4UbWXO',
  },
  'hot-honey-chicken-burger': {
    card: require('../../assets/recipes/hot-honey-chicken-burger.webp'),
    square: require('../../assets/recipes/hot-honey-chicken-burger-square.webp'),
    blurhash: 'LdKTYt~AI@X9yC%LRPR*tlJAnhsS',
    squareBlurhash: 'LgKc@B}@NIkDyC%LWAWVtmJVjFs-',
  },
  'baked-feta-pasta': {
    card: require('../../assets/recipes/baked-feta-pasta.webp'),
    square: require('../../assets/recipes/baked-feta-pasta-square.webp'),
    blurhash: 'LRH,0L}WDjI?AGV[bDkqIq,Dx@kW',
    squareBlurhash: 'LDJP6|_%02T{15ROpIJBMf}q%zIV',
  },
  'marry-me-chicken': {
    card: require('../../assets/recipes/marry-me-chicken.webp'),
    square: require('../../assets/recipes/marry-me-chicken-square.webp'),
    blurhash: 'LGBpFAbb.7s:~Ux[%Moe%fxu$%xt',
    squareBlurhash: 'LCA,I2bvtlxG~U%Mxus:yCj]$%t7',
  },
  'smash-burger-tacos': {
    card: require('../../assets/recipes/smash-burger-tacos.webp'),
    square: require('../../assets/recipes/smash-burger-tacos-square.webp'),
    blurhash: 'LlLzNySi_N-p.Txut8bb-:jbIUay',
    squareBlurhash: 'LkM%G$kW?v?GyZtRtRbJ_2xaIBWq',
  },
  'crispy-rice-salmon-bites': {
    card: require('../../assets/recipes/crispy-rice-salmon-bites.webp'),
    square: require('../../assets/recipes/crispy-rice-salmon-bites-square.webp'),
    blurhash: 'LBE.FRxtI:%200RjniWAK-ofxbNH',
    squareBlurhash: 'L9FE.Vt6bux]00RQr=V@B@xuR:NG',
  },
  'gochujang-butter-noodles': {
    card: require('../../assets/recipes/gochujang-butter-noodles.webp'),
    square: require('../../assets/recipes/gochujang-butter-noodles-square.webp'),
    blurhash: 'L5I42-7}0M?81nN60goY05^7-U9Z',
    squareBlurhash: 'L5I3{m%#0M^ICA179bxp0D]XIqIU',
  },
  'hot-honey-salmon-bowl': {
    card: require('../../assets/recipes/hot-honey-salmon-bowl.webp'),
    square: require('../../assets/recipes/hot-honey-salmon-bowl-square.webp'),
    blurhash: 'LWOMKZtQ^,-V~pt8R-oI?IjJE0W.',
    squareBlurhash: 'LVNve{Nr?b?a~pxvR.s:^,xbITRj',
  },
  'garlic-parmesan-smashed-potatoes': {
    card: require('../../assets/recipes/garlic-parmesan-smashed-potatoes.webp'),
    square: require('../../assets/recipes/garlic-parmesan-smashed-potatoes-square.webp'),
    blurhash: 'L7JZ#1tl02L#B@M|ZOvL3E-Ao_#h',
    squareBlurhash: 'LAK0cRBX00{cGJM|mQ$KO[xu=:I.',
  },
  'oven-doner-kebab-wraps': {
    card: require('../../assets/recipes/oven-doner-kebab-wraps.webp'),
    square: require('../../assets/recipes/oven-doner-kebab-wraps-square.webp'),
    blurhash: 'L6Hd~U~q0F*000H;Dgr.00PX?cRW',
    squareBlurhash: 'L6F#%E~q0ryZ00DgZyMv01Y8~XIw',
  },
  'red-curry-dumpling-bake': {
    card: require('../../assets/recipes/red-curry-dumpling-bake.webp'),
    square: require('../../assets/recipes/red-curry-dumpling-bake-square.webp'),
    blurhash: 'LRI:p;-o%1sn}na~s9RjJVNHNaS3',
    squareBlurhash: 'LWH,|i%2xut6}?WrozazF3NbOYX8',
  },
  'greek-chicken-bowls': {
    card: require('../../assets/recipes/greek-chicken-bowls.webp'),
    square: require('../../assets/recipes/greek-chicken-bowls-square.webp'),
    blurhash: 'LHI#u$4T0:yY9G-=xtoycb?wn1w{',
    squareBlurhash: 'LNJa=jD4EUbwDjxvxtoIY8yEVqt8',
  },
  'cottage-cheese-flatbread': {
    card: require('../../assets/recipes/cottage-cheese-flatbread.webp'),
    square: require('../../assets/recipes/cottage-cheese-flatbread-square.webp'),
    blurhash: 'LhM~~}V[s:s,~TkDRjj@S6t7R*bI',
    squareBlurhash: 'LZNJ8SV@s:xZ~TkCRjoLIroebHbI',
  },
  'smash-falafel-pita': {
    card: require('../../assets/recipes/smash-falafel-pita.webp'),
    square: require('../../assets/recipes/smash-falafel-pita-square.webp'),
    blurhash: 'LFHw#[:i%$X4PqXha7rY#m%39YI;',
    squareBlurhash: 'LAHKOa}rYP%K80b^Qp,@+Kiw5O9a',
  },
  'pesto-eggs-toast': {
    card: require('../../assets/recipes/pesto-eggs-toast.webp'),
    square: require('../../assets/recipes/pesto-eggs-toast-square.webp'),
    blurhash: 'LrLE4tt5a~xC?vj]axj[yZWZR*R+',
    squareBlurhash: 'LrL4g1t6OFxD?vogj=s:%%s;soR.',
  },
  'creamy-tuscan-gnocchi': {
    card: require('../../assets/recipes/creamy-tuscan-gnocchi.webp'),
    square: require('../../assets/recipes/creamy-tuscan-gnocchi-square.webp'),
    blurhash: 'LJEyG8~TRSITD*Io-pIqIUIUxtkW',
    squareBlurhash: 'LIEL~S~TM}InD*E3-oRl9GE2xZSi',
  },
  'korean-beef-bowls': {
    card: require('../../assets/recipes/korean-beef-bowls.webp'),
    square: require('../../assets/recipes/korean-beef-bowls-square.webp'),
    blurhash: 'L9C$=V~U01R:%ERiE3R:05oh%JDj',
    squareBlurhash: 'LJDvJz~UD+xv${oaRPM|9Joh%LWB',
  },
  'chicken-birria-quesadillas': {
    card: require('../../assets/recipes/chicken-birria-quesadillas.webp'),
    square: require('../../assets/recipes/chicken-birria-quesadillas-square.webp'),
    blurhash: 'L7G*l{Hq02_M03h0M_WU05-T=^JC',
    squareBlurhash: 'L5Hw_SD402?G01ys4-pG03-mwHAc',
  },
  'protein-baked-oats': {
    card: require('../../assets/recipes/protein-baked-oats.webp'),
    square: require('../../assets/recipes/protein-baked-oats-square.webp'),
    blurhash: 'LCH24V~U4o~B~o%KM|NH00%1t7M|',
    squareBlurhash: 'LGGIAU~UIA?F~ps,Iot7D%%1xaM|',
  },
  'garlic-butter-steak-bites': {
    card: require('../../assets/recipes/garlic-butter-steak-bites.webp'),
    square: require('../../assets/recipes/garlic-butter-steak-bites-square.webp'),
    blurhash: 'LCG%*-%n130O[p-VBN7_{.d?P9%J',
    squareBlurhash: 'LEH10SXx0OEO}FtO3QS}{6M|t*xs',
  },
  'pepper-feta-penne': {
    card: require('../../assets/recipes/pepper-feta-penne.webp'),
    square: require('../../assets/recipes/pepper-feta-penne-square.webp'),
    blurhash: 'LPN0C9^#^rxr~JbbM|ad-fR*N1oe',
    squareBlurhash: 'LLNcS$~R^X-l=:kCW?WB}~R*D,oI',
  },
  'masala-dosa': {
    card: require('../../assets/recipes/masala-dosa.webp'),
    square: require('../../assets/recipes/masala-dosa-square.webp'),
    blurhash: 'LSI3%CemD+-n}9ocOrs:9HI[xXWB',
    squareBlurhash: 'LTIWig$|D+%L|=wIS#xZ9HERs:RQ',
  },
  'chicken-fried-rice': {
    card: require('../../assets/recipes/chicken-fried-rice.webp'),
    square: require('../../assets/recipes/chicken-fried-rice-square.webp'),
    blurhash: 'LgLDulV[Xps:~payM}j?OuofMxfk',
    squareBlurhash: 'LqK,{MnMXTs+~Vs.R-ofOttRRQW?',
  },
  'butter-chicken': {
    card: require('../../assets/recipes/butter-chicken.webp'),
    square: require('../../assets/recipes/butter-chicken-square.webp'),
    blurhash: 'LVINmmMxysR*%ft7oNR*B:V@=wen',
    squareBlurhash: 'LRH-lSIA*0Na-oxbbwS1K*f6$3WB',
  },
  'crispy-chicken-burger': {
    card: require('../../assets/recipes/crispy-chicken-burger.webp'),
    square: require('../../assets/recipes/crispy-chicken-burger-square.webp'),
    blurhash: 'LEC#n}WY0OjY-UbHI;ni0Nay}=s.',
    squareBlurhash: 'L9EnFS110ORP}sNwADr=03$$}r=x',
  },
  'apple-turnovers': {
    card: require('../../assets/recipes/apple-turnovers.webp'),
    square: require('../../assets/recipes/apple-turnovers-square.webp'),
    blurhash: 'LOK0$s:.nQxv|M+H$$NHv;+twagN',
    squareBlurhash: 'LQKTGD+eohxu{h;2aeMx+*+Zo|x[',
  },
  'mushroom-spaghetti': {
    card: require('../../assets/recipes/mushroom-spaghetti.webp'),
    square: require('../../assets/recipes/mushroom-spaghetti-square.webp'),
    blurhash: 'LLMQX@?I.Ao}0MRQrXWU9xM{RPRP',
    squareBlurhash: 'LEL|uk~U?I?Z03Rmw4xuALRks?Mz',
  },
  'margherita-pizza': {
    card: require('../../assets/recipes/margherita-pizza.webp'),
    square: require('../../assets/recipes/margherita-pizza-square.webp'),
    blurhash: 'LDKTxox^3F-p=Y8^OZRiCTRiHqEL',
    squareBlurhash: 'LMK,$^xvF}-p,.ITS$aePXs;R4OF',
  },
  'crispy-samosas': {
    card: require('../../assets/recipes/crispy-samosas.webp'),
    square: require('../../assets/recipes/crispy-samosas-square.webp'),
    blurhash: 'LXJ72NV?%MsT_4D*S$WBu5afn%R,',
    squareBlurhash: 'LMIgDg-o%1-V?wE2NHt7p{soNHt8',
  },
  'chicken-biryani': {
    card: require('../../assets/recipes/chicken-biryani.webp'),
    square: require('../../assets/recipes/chicken-biryani-square.webp'),
    blurhash: 'LgK^Z[$zo~$%.TozaeWXTKg3M_WD',
    squareBlurhash: 'LhK^QmxWxu-U.TtQjZkCk?tRM{WX',
  },
  'chocolate-raspberry-cake': {
    card: require('../../assets/recipes/chocolate-raspberry-cake.webp'),
    square: require('../../assets/recipes/chocolate-raspberry-cake-square.webp'),
    blurhash: 'LZODd_NF_N-;_4t8M{WB_4j[9FWC',
    squareBlurhash: 'LON,-@M__N-;R5WU_3%MaPt8tRj[',
  },
  'strawberry-cream-squares': {
    card: require('../../assets/recipes/strawberry-cream-squares.webp'),
    square: require('../../assets/recipes/strawberry-cream-squares-square.webp'),
    blurhash: 'L9IhT=xvPp-;?cNG9ZRPUHR*4TaK',
    squareBlurhash: 'LGI#W3xbu5%L?cbHNaV[ysW;DOjY',
  },
};
