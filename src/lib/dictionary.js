// =============================================================================
//  EDITABLE KEYWORD DICTIONARY (Arabic + English)
//  classify.js uses this to turn label text into our product schema.
//  - Strings are matched case-insensitively after normalisation
//    (Arabic: diacritics removed, أ/إ/آ -> ا, ى -> ي, ة -> ه; Arabic digits -> 0-9).
//  - Latin keywords must start at a word boundary; plural "s"/"es" is allowed.
//  - You can also use a RegExp for special cases (e.g. "لحم" but not "لحم دجاج").
//  The verdict itself is NOT decided here: scoring.js applies the evidence rules.
// =============================================================================

export const DICTIONARY = {
  nitrites: [
    'nitrite', 'nitrate', 'نتريت', 'نيتريت', 'نترات', 'e250', 'e249', 'e251', 'e252',
  ],

  processedMeat: [
    'luncheon', 'لانشون', 'لنشون', 'mortadella', 'مرتديلا', 'مارتديلا', 'sausage', 'نقانق', 'سجق',
    'salami', 'سلامي', 'hot dog', 'hotdog', 'هوت دوغ', 'pastrami', 'بسطرمه', 'basterma', 'cured',
    'smoked meat', 'لحم مدخن', 'ham', 'bacon', 'corned beef', 'كورند بيف', 'frankfurter', 'cold cut',
    'pepperoni', 'ببروني', 'مصنعه من اللحم', 'لحوم مصنعه', 'processed meat', 'mechanically separated',
    'مفصول اليا',
  ],

  // "لحم" alone counts as red meat, except chicken / turkey / fish meat.
  redMeat: [
    'beef', 'لحم بقر', 'لحم بقري', 'lamb', 'لحم غنم', 'mutton', 'veal', 'لحم عجل', 'goat meat', 'لحم ماعز',
    'لحم ضان', 'minced meat', 'لحمه مفرومه',
    /لحم(?!\s*(ال)?(دجاج|ديك|سمك|طيور|حبش))/,
  ],

  wholegrain: [
    'whole wheat', 'wholewheat', 'wholegrain', 'whole grain', 'wholemeal', 'whole meal', 'قمح كامل',
    'حبوب كامله', 'طحين اسمر', 'خبز اسمر', 'oats', 'oat', 'شوفان', 'bran', 'نخاله', 'freekeh', 'فريكه',
    'bulgur', 'برغل', 'brown rice', 'رز بني', 'barley', 'شعير', 'rye', 'جاودار',
  ],

  refinedGrain: [
    'wheat flour', 'طحين ابيض', 'white flour', 'refined', 'مكرر', 'طحين القمح', 'طحين قمح',
    'enriched flour', 'all purpose flour', 'دقيق ابيض', 'white rice', 'رز ابيض', 'semolina', 'سميد',
  ],

  sugar: [
    'sugar', 'سكر', 'glucose syrup', 'شراب الجلوكوز', 'شراب الجلوكوز', 'جلوكوز', 'fructose', 'فركتوز',
    'high fructose corn syrup', 'corn syrup', 'شراب الذره', 'dextrose', 'دكستروز', 'sucrose', 'سكروز',
    'invert syrup', 'molasses', 'دبس',
  ],

  drink: [
    'carbonated water', 'مياه مكربنه', 'مياه غازيه', 'مشروب', 'drink', 'beverage', 'soda', 'cola', 'كولا',
    'juice', 'عصير', 'nectar', 'نكتار', 'energy drink', 'مشروب طاقه', 'iced tea',
  ],

  flavourEnhancer: [
    'flavour enhancer', 'flavor enhancer', 'محسن نكهه', 'محسن للنكهه', 'monosodium glutamate', 'msg',
    'غلوتامات', 'جلوتامات', 'e621', 'e627', 'e631', 'e635',
  ],

  // Extra ultra-processing markers (count together with E-numbers)
  upfMarkers: [
    'maltodextrin', 'مالتودكسترين', 'hydrogenated', 'مهدرج', 'modified starch', 'نشا معدل',
    'high fructose corn syrup', 'emulsifier', 'مستحلب', 'artificial flavour', 'artificial flavor',
    'نكهه صناعيه', 'colour', 'color', 'ملون', 'soy protein isolate', 'protein isolate',
  ],

  dairy: [
    'milk', 'حليب', 'yoghurt', 'yogurt', 'لبن', 'laban', 'labneh', 'labaneh', 'لبنه', 'cheese', 'جبن', 'جبنه',
    'ayran', 'عيران', 'jameed', 'جميد',
  ],

  snack: [
    'chips', 'crisps', 'شيبس', 'شبس', 'biscuit', 'بسكويت', 'chocolate', 'شوكولاته', 'شوكولا', 'wafer', 'ويفر',
    'cake', 'كيك', 'candy', 'حلوى', 'cookie', 'كوكيز', 'puffs', 'snack', 'سناك', 'نقرشات',
    'potato', 'بطاطا', 'بطاطس', 'popcorn', 'فشار',
  ],
};

// How many E-numbers (plus UPF markers) count as "many" -> ultra-processed.
export const UPF_THRESHOLD = 3;

// Open Food Facts category tags -> our categories (first match wins, in this order).
export const OFF_CATEGORY_MAP = [
  ['processed_meat', ['en:processed-meats', 'en:sausages', 'en:hams', 'en:salamis', 'en:cold-cuts', 'en:mortadella', 'en:luncheon-meats', 'en:bacons', 'en:frankfurters', 'en:hot-dogs', 'en:cured-meats', 'en:corned-beef']],
  ['red_meat', ['en:beef', 'en:lamb-meat', 'en:red-meats', 'en:veal', 'en:minced-beef']],
  ['sugary_drink', ['en:sodas', 'en:sweetened-beverages', 'en:carbonated-drinks', 'en:colas', 'en:fruit-nectars', 'en:juice-drinks', 'en:energy-drinks', 'en:iced-teas', 'en:fruit-based-beverages']],
  ['wholegrain', ['en:whole-wheat-breads', 'en:wholemeal-breads', 'en:whole-grain-breads', 'en:oat-flakes', 'en:rolled-oats', 'en:oatmeals', 'en:bulgur', 'en:brown-rices', 'en:whole-grain-pastas', 'en:popcorn']],
  ['refined_grain', ['en:white-breads', 'en:sliced-breads', 'en:sandwich-breads', 'en:breads', 'en:white-rices', 'en:pastas']],
  ['snack', ['en:sweet-spreads', 'en:chocolate-spreads', 'en:confectionary-based-spreads', 'en:chips-and-fries', 'en:crisps', 'en:potato-crisps', 'en:biscuits', 'en:confectioneries', 'en:chocolates', 'en:salty-snacks', 'en:sweet-snacks', 'en:cakes', 'en:snacks']],
  ['dairy', ['en:dairies', 'en:milks', 'en:yogurts', 'en:cheeses', 'en:labneh', 'en:fermented-milk-products']],
];
