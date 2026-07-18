import type { QueryInterface } from 'sequelize';
import type { AttributeField } from '../types';

interface CategorySeed {
  name: string;
  slug: string;
  sortOrder: number;
  attributeSchema: AttributeField[];
}

const CATEGORIES: CategorySeed[] = [
  // ── 1. Grocery ────────────────────────────────────────────────────────────────
  {
    name: 'Grocery',
    slug: 'grocery',
    sortOrder: 1,
    attributeSchema: [
      { key: 'brand',           label: 'Brand',                type: 'text',        required: false },
      { key: 'weight',          label: 'Weight / Volume',      type: 'text',        required: true,  unit: 'g / ml', isVariant: true, isStockDependent: true },
      { key: 'quantity_per_pack', label: 'Quantity per Pack',  type: 'number',      required: false, unit: 'pcs', isVariant: true },
      { key: 'organic',         label: 'Organic',              type: 'select',      required: false,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      { key: 'storage',         label: 'Storage Requirement',  type: 'select',      required: false,
        options: [
          { label: 'Room Temperature',    value: 'room_temp' },
          { label: 'Refrigerate (0–8°C)', value: 'refrigerate' },
          { label: 'Freeze (below 0°C)',  value: 'freeze' },
        ] },
      { key: 'dietary',         label: 'Dietary Tags',         type: 'multiselect', required: false,
        options: [
          { label: 'Vegan',        value: 'vegan' },
          { label: 'Vegetarian',   value: 'vegetarian' },
          { label: 'Gluten-Free',  value: 'gluten_free' },
          { label: 'Dairy-Free',   value: 'dairy_free' },
          { label: 'Nut-Free',     value: 'nut_free' },
          { label: 'Sugar-Free',   value: 'sugar_free' },
          { label: 'Keto',         value: 'keto' },
        ] },
      { key: 'country_of_origin', label: 'Country of Origin', type: 'text',        required: false },
    ],
  },

  // ── 2. Restaurant & Food ──────────────────────────────────────────────────────
  {
    name: 'Restaurant & Food',
    slug: 'restaurant-food',
    sortOrder: 2,
    attributeSchema: [
      { key: 'veg',         label: 'Veg / Non-Veg',   type: 'select',      required: true,
        options: [
          { label: 'Veg',     value: 'veg' },
          { label: 'Non-Veg', value: 'non_veg' },
          { label: 'Egg',     value: 'egg' },
        ] },
      { key: 'spice_level', label: 'Spice Level',     type: 'select',      required: false, isVariant: true,
        options: [
          { label: 'No Spice',   value: 'none' },
          { label: 'Mild',       value: 'mild' },
          { label: 'Medium',     value: 'medium' },
          { label: 'Hot',        value: 'hot' },
          { label: 'Extra Hot',  value: 'extra_hot' },
        ] },
      { key: 'cuisine',     label: 'Cuisine Type',    type: 'select',      required: false,
        options: [
          { label: 'North Indian',  value: 'north_indian' },
          { label: 'South Indian',  value: 'south_indian' },
          { label: 'Chinese',       value: 'chinese' },
          { label: 'Italian',       value: 'italian' },
          { label: 'Mexican',       value: 'mexican' },
          { label: 'Continental',   value: 'continental' },
          { label: 'Fast Food',     value: 'fast_food' },
          { label: 'Street Food',   value: 'street_food' },
          { label: 'Bakery',        value: 'bakery' },
          { label: 'Other',         value: 'other' },
        ] },
      { key: 'dietary_tags', label: 'Dietary Tags',   type: 'multiselect', required: false,
        options: [
          { label: 'Jain',         value: 'jain' },
          { label: 'Vegan',        value: 'vegan' },
          { label: 'Gluten-Free',  value: 'gluten_free' },
          { label: 'Sugar-Free',   value: 'sugar_free' },
          { label: 'Low-Calorie',  value: 'low_calorie' },
          { label: 'Keto',         value: 'keto' },
        ] },
      { key: 'portion',      label: 'Portion / Weight', type: 'text',      required: false, unit: 'g / ml', isVariant: true, isStockDependent: true },
      { key: 'prep_time',    label: 'Prep Time',        type: 'number',    required: false, unit: 'mins' },
      { key: 'ingredients',  label: 'Ingredients',      type: 'textarea',  required: false },
      { key: 'allergens',    label: 'Allergens',         type: 'text',     required: false },
    ],
  },

  // ── 3. Electronics & Gadgets ──────────────────────────────────────────────────
  {
    name: 'Electronics',
    slug: 'electronics',
    sortOrder: 3,
    attributeSchema: [
      { key: 'brand',        label: 'Brand',            type: 'text',        required: true },
      { key: 'model_no',     label: 'Model Number',     type: 'text',        required: false },
      { key: 'condition',    label: 'Condition',        type: 'select',      required: true,
        options: [
          { label: 'New',          value: 'new' },
          { label: 'Refurbished',  value: 'refurbished' },
          { label: 'Used',         value: 'used' },
        ] },
      { key: 'warranty',     label: 'Warranty',         type: 'number',      required: false, unit: 'months' },
      { key: 'connectivity', label: 'Connectivity',     type: 'multiselect', required: false,
        options: [
          { label: 'Wi-Fi',       value: 'wifi' },
          { label: 'Bluetooth',   value: 'bluetooth' },
          { label: 'USB',         value: 'usb' },
          { label: 'USB-C',       value: 'usb_c' },
          { label: 'HDMI',        value: 'hdmi' },
          { label: '4G / LTE',    value: '4g' },
          { label: '5G',          value: '5g' },
          { label: 'NFC',         value: 'nfc' },
          { label: 'Infrared',    value: 'ir' },
        ] },
      { key: 'color',        label: 'Color',            type: 'color',       required: false, isVariant: true,
        options: [
          { label: 'Black',      value: 'black' },
          { label: 'White',      value: 'white' },
          { label: 'Silver',     value: 'silver' },
          { label: 'Gold',       value: 'gold' },
          { label: 'Space Grey', value: 'space_grey' },
          { label: 'Rose Gold',  value: 'rose_gold' },
          { label: 'Blue',       value: 'blue' },
          { label: 'Green',      value: 'green' },
          { label: 'Red',        value: 'red' },
        ] },
      { key: 'storage_capacity', label: 'Storage / Capacity', type: 'select', required: false, isVariant: true, isStockDependent: true,
        options: [
          { label: '64 GB',         value: '64gb' },
          { label: '128 GB',        value: '128gb' },
          { label: '256 GB',        value: '256gb' },
          { label: '512 GB',        value: '512gb' },
          { label: '1 TB',          value: '1tb' },
          { label: 'Not Applicable',value: 'na' },
        ] },
      { key: 'voltage',      label: 'Voltage / Power',  type: 'select',     required: false,
        options: [
          { label: '110V',                 value: '110v' },
          { label: '220–240V',             value: '220v' },
          { label: 'Universal 100–240V',   value: 'universal' },
          { label: 'Battery Operated',     value: 'battery' },
          { label: 'USB Powered',          value: 'usb' },
        ] },
      { key: 'in_box',       label: 'In the Box',       type: 'textarea',   required: false },
    ],
  },

  // ── 4. Fashion & Clothing ─────────────────────────────────────────────────────
  {
    name: 'Fashion & Clothing',
    slug: 'fashion-clothing',
    sortOrder: 4,
    attributeSchema: [
      { key: 'gender',      label: 'Gender',             type: 'select',      required: true,
        options: [
          { label: 'Men',    value: 'men' },
          { label: 'Women',  value: 'women' },
          { label: 'Unisex', value: 'unisex' },
          { label: 'Boys',   value: 'boys' },
          { label: 'Girls',  value: 'girls' },
        ] },
      { key: 'sizes',       label: 'Available Sizes',    type: 'multiselect', required: true, isVariant: true, isStockDependent: true,
        options: [
          { label: 'XS',        value: 'XS' },  { label: 'S',         value: 'S' },
          { label: 'M',         value: 'M' },   { label: 'L',         value: 'L' },
          { label: 'XL',        value: 'XL' },  { label: 'XXL',       value: 'XXL' },
          { label: '3XL',       value: '3XL' }, { label: 'Free Size',  value: 'free_size' },
          { label: '28',        value: '28' },  { label: '30',        value: '30' },
          { label: '32',        value: '32' },  { label: '34',        value: '34' },
          { label: '36',        value: '36' },  { label: '38',        value: '38' },
          { label: '40',        value: '40' },  { label: '42',        value: '42' },
          { label: '44',        value: '44' },
          { label: '2Y',        value: '2Y' },  { label: '4Y',        value: '4Y' },
          { label: '6Y',        value: '6Y' },  { label: '8Y',        value: '8Y' },
          { label: '10Y',       value: '10Y' }, { label: '12Y',       value: '12Y' },
        ] },
      { key: 'colors',      label: 'Available Colors',   type: 'color',       required: false, isVariant: true,
        options: [
          { label: 'Black',   value: 'black' }, { label: 'White',   value: 'white' },
          { label: 'Red',     value: 'red' }, { label: 'Blue',    value: 'blue' },
          { label: 'Navy',    value: 'navy' }, { label: 'Green',   value: 'green' },
          { label: 'Olive',   value: 'olive' }, { label: 'Yellow',  value: 'yellow' },
          { label: 'Pink',    value: 'pink' }, { label: 'Maroon',  value: 'maroon' },
          { label: 'Beige',   value: 'beige' }, { label: 'Brown',   value: 'brown' },
          { label: 'Grey',    value: 'grey' }, { label: 'Orange',  value: 'orange' },
          { label: 'Purple',  value: 'purple' }, { label: 'Cream',   value: 'cream' },
        ] },
      { key: 'material',           label: 'Material / Fabric',    type: 'text',     required: false },
      { key: 'occasion',           label: 'Occasion',             type: 'multiselect', required: false,
        options: [
          { label: 'Casual',           value: 'casual' },
          { label: 'Formal',           value: 'formal' },
          { label: 'Party',            value: 'party' },
          { label: 'Wedding / Bridal', value: 'wedding' },
          { label: 'Sports / Active',  value: 'sports' },
          { label: 'Beach / Lounge',   value: 'beach' },
          { label: 'Ethnic / Festival',value: 'ethnic' },
          { label: 'Workwear',         value: 'workwear' },
        ] },
      { key: 'care_instructions',  label: 'Care Instructions',    type: 'textarea', required: false },
      { key: 'country_of_origin',  label: 'Country of Origin',    type: 'text',     required: false },
    ],
  },

  // ── 5. Pharmacy & Medicine ────────────────────────────────────────────────────
  {
    name: 'Pharmacy',
    slug: 'pharmacy',
    sortOrder: 5,
    attributeSchema: [
      { key: 'manufacturer',  label: 'Manufacturer',          type: 'text',     required: true },
      { key: 'form',          label: 'Form',                  type: 'select',   required: true, isVariant: true,
        options: [
          { label: 'Tablet',         value: 'tablet' },
          { label: 'Capsule',        value: 'capsule' },
          { label: 'Syrup / Liquid', value: 'syrup' },
          { label: 'Gel',            value: 'gel' },
          { label: 'Cream / Ointment', value: 'cream' },
          { label: 'Powder',         value: 'powder' },
          { label: 'Drops',          value: 'drops' },
          { label: 'Injection',      value: 'injection' },
          { label: 'Inhaler',        value: 'inhaler' },
          { label: 'Patch',          value: 'patch' },
          { label: 'Device',         value: 'device' },
          { label: 'Sachet',         value: 'sachet' },
        ] },
      { key: 'prescription',  label: 'Prescription Required', type: 'select',   required: true,
        options: [
          { label: 'No – OTC',         value: 'no_otc' },
          { label: 'Yes – Schedule H', value: 'yes_h' },
          { label: 'Yes – Schedule X', value: 'yes_x' },
        ] },
      { key: 'composition',   label: 'Salt / Composition',    type: 'textarea', required: false },
      { key: 'dosage',        label: 'Dosage / Strength',     type: 'text',     required: false, isVariant: true },
      { key: 'pack_size',     label: 'Pack Size',             type: 'number',   required: false, unit: 'units', isVariant: true, isStockDependent: true },
      { key: 'storage',       label: 'Storage',               type: 'select',   required: false,
        options: [
          { label: 'Room Temperature',     value: 'room_temp' },
          { label: 'Store below 25°C',     value: 'below_25' },
          { label: 'Refrigerate (2–8°C)',  value: 'refrigerate' },
          { label: 'Keep Dry',             value: 'dry' },
          { label: 'Avoid Direct Sunlight',value: 'dark' },
        ] },
      { key: 'expiry_note',   label: 'Expiry / Shelf Life',   type: 'text',     required: false },
    ],
  },

  // ── 6. Beauty & Personal Care ─────────────────────────────────────────────────
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    sortOrder: 6,
    attributeSchema: [
      { key: 'brand',            label: 'Brand',               type: 'text',        required: true },
      { key: 'volume',           label: 'Volume / Weight',     type: 'text',        required: true, unit: 'ml / g', isVariant: true, isStockDependent: true },
      { key: 'skin_type',        label: 'Suitable Skin Type',  type: 'multiselect', required: false,
        options: [
          { label: 'Normal',       value: 'normal' },
          { label: 'Dry',          value: 'dry' },
          { label: 'Oily',         value: 'oily' },
          { label: 'Combination',  value: 'combination' },
          { label: 'Sensitive',    value: 'sensitive' },
          { label: 'All Types',    value: 'all' },
        ] },
      { key: 'shade',            label: 'Shade / Color',       type: 'color',       required: false, isVariant: true,
        options: [
          { label: 'Nude',    value: 'nude' }, { label: 'Coral',   value: 'coral' },
          { label: 'Red',     value: 'red' }, { label: 'Pink',    value: 'pink' },
          { label: 'Mauve',   value: 'mauve' }, { label: 'Berry',   value: 'berry' },
          { label: 'Brown',   value: 'brown' }, { label: 'Peach',   value: 'peach' },
          { label: 'Beige',   value: 'beige' }, { label: 'Clear',   value: 'clear' },
        ] },
      { key: 'key_ingredients',  label: 'Key Ingredients',     type: 'textarea',    required: false },
      { key: 'how_to_use',       label: 'How to Use',          type: 'textarea',    required: false },
      { key: 'spf',              label: 'SPF',                 type: 'number',      required: false },
      { key: 'country_of_origin',label: 'Country of Origin',   type: 'text',        required: false },
    ],
  },

  // ── 7. Home & Kitchen ─────────────────────────────────────────────────────────
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    sortOrder: 7,
    attributeSchema: [
      { key: 'brand',             label: 'Brand',               type: 'text',        required: false },
      { key: 'material',          label: 'Material',            type: 'text',        required: true },
      { key: 'dimensions',        label: 'Dimensions (L×W×H)',  type: 'text',        required: false, unit: 'cm' },
      { key: 'color',             label: 'Color / Finish',      type: 'color',       required: false, isVariant: true,
        options: [
          { label: 'Black',    value: 'black' }, { label: 'White',    value: 'white' },
          { label: 'Silver',   value: 'silver' }, { label: 'Gold',     value: 'gold' },
          { label: 'Brown',    value: 'brown' }, { label: 'Beige',    value: 'beige' },
          { label: 'Grey',     value: 'grey' }, { label: 'Red',      value: 'red' },
          { label: 'Blue',     value: 'blue' }, { label: 'Green',    value: 'green' },
        ] },
      { key: 'capacity',          label: 'Capacity / Quantity', type: 'text',        required: false, unit: 'L / pcs', isVariant: true, isStockDependent: true },
      { key: 'suitable_for',      label: 'Suitable For',        type: 'multiselect', required: false,
        options: [
          { label: 'Gas Stove',    value: 'gas' },
          { label: 'Induction',    value: 'induction' },
          { label: 'Microwave',    value: 'microwave' },
          { label: 'Oven',         value: 'oven' },
          { label: 'Dishwasher Safe', value: 'dishwasher' },
          { label: 'All Cooktops', value: 'all' },
        ] },
      { key: 'assembly_required', label: 'Assembly Required',   type: 'select',      required: false,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      { key: 'warranty',          label: 'Warranty',            type: 'number',      required: false, unit: 'months' },
    ],
  },

  // ── 8. Sports & Fitness ───────────────────────────────────────────────────────
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    sortOrder: 8,
    attributeSchema: [
      { key: 'brand',        label: 'Brand',          type: 'text',        required: false },
      { key: 'sport',        label: 'Sport / Activity', type: 'select',    required: false,
        options: [
          { label: 'Cricket',     value: 'cricket' },   { label: 'Football',    value: 'football' },
          { label: 'Basketball',  value: 'basketball' },{ label: 'Tennis',      value: 'tennis' },
          { label: 'Badminton',   value: 'badminton' }, { label: 'Swimming',    value: 'swimming' },
          { label: 'Gym / Fitness', value: 'gym' },     { label: 'Yoga',        value: 'yoga' },
          { label: 'Running',     value: 'running' },   { label: 'Cycling',     value: 'cycling' },
          { label: 'Martial Arts',value: 'martial_arts'},{ label: 'Other',      value: 'other' },
        ] },
      { key: 'suitable_for', label: 'Suitable For',   type: 'multiselect', required: false,
        options: [
          { label: 'Men',    value: 'men' },   { label: 'Women', value: 'women' },
          { label: 'Kids',   value: 'kids' },  { label: 'Unisex',value: 'unisex' },
        ] },
      { key: 'size',         label: 'Size',           type: 'text',        required: false, isVariant: true, isStockDependent: true },
      { key: 'color',        label: 'Color',          type: 'color',       required: false, isVariant: true,
        options: [
          { label: 'Black',  value: 'black' }, { label: 'White',  value: 'white' },
          { label: 'Red',    value: 'red' }, { label: 'Blue',   value: 'blue' },
          { label: 'Yellow', value: 'yellow' }, { label: 'Green',  value: 'green' },
          { label: 'Orange', value: 'orange' }, { label: 'Grey',   value: 'grey' },
          { label: 'Pink',   value: 'pink' },
        ] },
      { key: 'material',     label: 'Material',       type: 'text',        required: false },
      { key: 'weight',       label: 'Weight',         type: 'number',      required: false, unit: 'kg' },
    ],
  },

  // ── 9. Books & Stationery ─────────────────────────────────────────────────────
  {
    name: 'Books & Stationery',
    slug: 'books-stationery',
    sortOrder: 9,
    attributeSchema: [
      { key: 'item_type',  label: 'Type',            type: 'select',   required: true,
        options: [
          { label: 'Book',                value: 'book' },
          { label: 'Notebook / Diary',    value: 'notebook' },
          { label: 'Pen / Pencil',        value: 'pen_pencil' },
          { label: 'Marker / Highlighter',value: 'marker' },
          { label: 'Art Supply',          value: 'art' },
          { label: 'Office Supply',       value: 'office' },
          { label: 'Other',               value: 'other' },
        ] },
      { key: 'author',     label: 'Author',          type: 'text',     required: false },
      { key: 'publisher',  label: 'Publisher',       type: 'text',     required: false },
      { key: 'isbn',       label: 'ISBN',            type: 'text',     required: false },
      { key: 'language',   label: 'Language',        type: 'select',   required: false, isVariant: true, isStockDependent: true,
        options: [
          { label: 'English',   value: 'english' },   { label: 'Hindi',     value: 'hindi' },
          { label: 'Marathi',   value: 'marathi' },   { label: 'Tamil',     value: 'tamil' },
          { label: 'Telugu',    value: 'telugu' },    { label: 'Kannada',   value: 'kannada' },
          { label: 'Bengali',   value: 'bengali' },   { label: 'Gujarati',  value: 'gujarati' },
          { label: 'Malayalam', value: 'malayalam' }, { label: 'Punjabi',   value: 'punjabi' },
          { label: 'Other',     value: 'other' },
        ] },
      { key: 'pages',      label: 'Pages',           type: 'number',   required: false },
      { key: 'edition',    label: 'Edition',         type: 'text',     required: false, isVariant: true },
      { key: 'subject',    label: 'Subject / Genre', type: 'text',     required: false },
    ],
  },

  // ── 10. Furniture & Decor (new) ───────────────────────────────────────────────
  {
    name: 'Furniture & Decor',
    slug: 'furniture-decor',
    sortOrder: 10,
    attributeSchema: [
      { key: 'material',          label: 'Material',            type: 'select',      required: true, isVariant: true, isStockDependent: true,
        options: [
          { label: 'Solid Wood',             value: 'solid_wood' },
          { label: 'Engineered Wood / MDF',  value: 'mdf' },
          { label: 'Plywood',                value: 'plywood' },
          { label: 'Metal / Steel',          value: 'metal' },
          { label: 'Plastic',                value: 'plastic' },
          { label: 'Glass',                  value: 'glass' },
          { label: 'Fabric / Upholstered',   value: 'fabric' },
          { label: 'Marble / Stone',         value: 'marble' },
          { label: 'Rattan / Cane',          value: 'rattan' },
          { label: 'Mixed',                  value: 'mixed' },
        ] },
      { key: 'color',             label: 'Color / Finish',      type: 'color',       required: false, isVariant: true,
        options: [
          { label: 'Natural Wood', value: 'natural_wood' }, { label: 'Walnut',      value: 'walnut' },
          { label: 'White',        value: 'white' }, { label: 'Black',       value: 'black' },
          { label: 'Grey',         value: 'grey' }, { label: 'Brown',       value: 'brown' },
          { label: 'Beige / Cream',value: 'beige' }, { label: 'Gold',        value: 'gold' },
          { label: 'Matte Black',  value: 'matte_black' },
        ] },
      { key: 'dimensions',        label: 'Dimensions (L×W×H)',  type: 'text',        required: true,  unit: 'cm' },
      { key: 'weight_capacity',   label: 'Weight Capacity',     type: 'number',      required: false, unit: 'kg' },
      { key: 'room_type',         label: 'Suitable Room',       type: 'multiselect', required: false,
        options: [
          { label: 'Living Room',    value: 'living_room' },
          { label: 'Bedroom',        value: 'bedroom' },
          { label: 'Dining Room',    value: 'dining_room' },
          { label: 'Kitchen',        value: 'kitchen' },
          { label: 'Bathroom',       value: 'bathroom' },
          { label: 'Office / Study', value: 'office' },
          { label: 'Outdoor / Balcony', value: 'outdoor' },
        ] },
      { key: 'style',             label: 'Style',               type: 'select',      required: false,
        options: [
          { label: 'Modern / Contemporary', value: 'modern' },
          { label: 'Traditional / Classic', value: 'traditional' },
          { label: 'Industrial',            value: 'industrial' },
          { label: 'Rustic / Farmhouse',    value: 'rustic' },
          { label: 'Minimalist',            value: 'minimalist' },
          { label: 'Bohemian',              value: 'bohemian' },
          { label: 'Scandinavian',          value: 'scandinavian' },
        ] },
      { key: 'assembly_required', label: 'Assembly Required',   type: 'select',      required: true,
        options: [{ label: 'Yes', value: 'yes' }, { label: 'No – Ready to Use', value: 'no' }] },
      { key: 'warranty',          label: 'Warranty',            type: 'number',      required: false, unit: 'months' },
    ],
  },

  // ── 11. Automotive & Vehicles (new) ───────────────────────────────────────────
  {
    name: 'Automotive & Vehicles',
    slug: 'automotive',
    sortOrder: 11,
    attributeSchema: [
      { key: 'brand',        label: 'Brand / Compatible With', type: 'text',        required: true },
      { key: 'vehicle_type', label: 'Vehicle Type',            type: 'select',      required: true,
        options: [
          { label: 'Car',              value: 'car' },
          { label: 'Motorcycle / Bike',value: 'bike' },
          { label: 'Scooter',          value: 'scooter' },
          { label: 'Truck / Tempo',    value: 'truck' },
          { label: 'SUV / MUV',        value: 'suv' },
          { label: 'All Vehicles',     value: 'all' },
        ] },
      { key: 'part_type',    label: 'Part / Category',         type: 'select',      required: false,
        options: [
          { label: 'Engine Part',         value: 'engine' },
          { label: 'Body Part',           value: 'body' },
          { label: 'Electrical',          value: 'electrical' },
          { label: 'Tyres & Wheels',      value: 'tyres' },
          { label: 'Interior Accessory',  value: 'interior' },
          { label: 'Exterior Accessory',  value: 'exterior' },
          { label: 'Car Care / Cleaning', value: 'care' },
          { label: 'Tool / Kit',          value: 'tool' },
          { label: 'Other',               value: 'other' },
        ] },
      { key: 'condition',    label: 'Condition',               type: 'select',      required: true,
        options: [
          { label: 'New / OEM',    value: 'new' },
          { label: 'Aftermarket',  value: 'aftermarket' },
          { label: 'Refurbished',  value: 'refurbished' },
          { label: 'Used',         value: 'used' },
        ] },
      { key: 'part_number',  label: 'Part Number / OEM Ref',   type: 'text',        required: false },
      { key: 'color',        label: 'Color',                   type: 'color',       required: false, isVariant: true,
        options: [
          { label: 'Black',   value: 'black' }, { label: 'White',  value: 'white' },
          { label: 'Silver',  value: 'silver' }, { label: 'Chrome', value: 'chrome' },
          { label: 'Red',     value: 'red' }, { label: 'Blue',   value: 'blue' },
        ] },
      { key: 'fitment_size', label: 'Size / Fitment',         type: 'text',        required: false, isVariant: true, isStockDependent: true },
      { key: 'compatible_models', label: 'Compatible Models',  type: 'textarea',    required: false },
      { key: 'warranty',     label: 'Warranty',                type: 'number',      required: false, unit: 'months' },
    ],
  },

  // ── 12. Toys & Games (new) ────────────────────────────────────────────────────
  {
    name: 'Toys & Games',
    slug: 'toys-games',
    sortOrder: 12,
    attributeSchema: [
      { key: 'brand',          label: 'Brand',                   type: 'text',        required: false },
      { key: 'age_group',      label: 'Suitable Age',            type: 'select',      required: true,
        options: [
          { label: '0–2 Years',   value: '0_2' },
          { label: '3–5 Years',   value: '3_5' },
          { label: '6–8 Years',   value: '6_8' },
          { label: '9–12 Years',  value: '9_12' },
          { label: '13+ Years',   value: '13_plus' },
          { label: 'All Ages',    value: 'all' },
        ] },
      { key: 'gender',         label: 'Gender',                  type: 'select',      required: false,
        options: [
          { label: 'Boys', value: 'boys' }, { label: 'Girls', value: 'girls' }, { label: 'Unisex', value: 'unisex' },
        ] },
      { key: 'toy_type',       label: 'Toy Type',                type: 'select',      required: false,
        options: [
          { label: 'Action Figure / Doll',   value: 'action_doll' },
          { label: 'Board Game',             value: 'board_game' },
          { label: 'Building / Blocks',      value: 'building' },
          { label: 'Outdoor / Sports Toy',   value: 'outdoor' },
          { label: 'Educational Toy',        value: 'educational' },
          { label: 'Soft Toy / Plush',       value: 'soft_toy' },
          { label: 'Remote Control',         value: 'rc' },
          { label: 'Puzzle',                 value: 'puzzle' },
          { label: 'Arts & Crafts',          value: 'arts_crafts' },
          { label: 'Card / Video Game',      value: 'video_game' },
          { label: 'Other',                  value: 'other' },
        ] },
      { key: 'color',          label: 'Color',                   type: 'color',       required: false, isVariant: true,
        options: [
          { label: 'Red',         value: 'red' }, { label: 'Blue',    value: 'blue' },
          { label: 'Yellow',      value: 'yellow' }, { label: 'Green',   value: 'green' },
          { label: 'Pink',        value: 'pink' }, { label: 'Purple',  value: 'purple' },
          { label: 'Orange',      value: 'orange' }, { label: 'Multi',   value: 'multi' },
        ] },
      { key: 'size',           label: 'Size',                    type: 'select',      required: false, isVariant: true, isStockDependent: true,
        options: [
          { label: 'Small',    value: 'small' },
          { label: 'Medium',   value: 'medium' },
          { label: 'Large',    value: 'large' },
          { label: 'One Size', value: 'one_size' },
        ] },
      { key: 'material',       label: 'Material',                type: 'text',        required: false },
      { key: 'battery_required', label: 'Battery Required',      type: 'select',      required: false,
        options: [
          { label: 'Yes – Included',     value: 'yes_included' },
          { label: 'Yes – Not Included', value: 'yes_not_included' },
          { label: 'No',                 value: 'no' },
        ] },
      { key: 'safety_tags',    label: 'Safety & Certifications', type: 'multiselect', required: false,
        options: [
          { label: 'BIS / IS 9873 Certified', value: 'bis' },
          { label: 'Non-Toxic',               value: 'non_toxic' },
          { label: 'No Sharp Edges',          value: 'no_sharp_edges' },
          { label: 'CE Certified',            value: 'ce' },
          { label: '3+ (Choking Warning)',    value: 'choking_3plus' },
        ] },
    ],
  },

  // ── 13. Jewellery & Accessories (new) ─────────────────────────────────────────
  {
    name: 'Jewellery & Accessories',
    slug: 'jewellery-accessories',
    sortOrder: 13,
    attributeSchema: [
      { key: 'material',   label: 'Material',       type: 'select',      required: true,
        options: [
          { label: 'Gold',                  value: 'gold' },
          { label: 'Silver / 925 Sterling', value: 'silver' },
          { label: 'Platinum',              value: 'platinum' },
          { label: 'Rose Gold',             value: 'rose_gold' },
          { label: 'Copper / Brass',        value: 'copper_brass' },
          { label: 'Alloy / Metal',         value: 'alloy' },
          { label: 'Fabric / Thread',       value: 'fabric' },
          { label: 'Leather',               value: 'leather' },
          { label: 'Artificial / Imitation',value: 'imitation' },
        ] },
      { key: 'purity',     label: 'Purity / Karat', type: 'text',        required: false },
      { key: 'color',      label: 'Color / Finish',  type: 'color',      required: false, isVariant: true,
        options: [
          { label: 'Gold',      value: 'gold' }, { label: 'Rose Gold',  value: 'rose_gold' },
          { label: 'Silver',    value: 'silver' }, { label: 'Gunmetal',   value: 'gunmetal' },
          { label: 'Black',     value: 'black' }, { label: 'White/Pearl',value: 'white' },
          { label: 'Multi',     value: 'multi' }, { label: 'Oxidised',   value: 'oxidised' },
          { label: 'Copper',    value: 'copper' },
        ] },
      { key: 'stone',      label: 'Stone / Gemstone',type: 'text',       required: false },
      { key: 'size',       label: 'Size',            type: 'text',        required: false, isVariant: true, isStockDependent: true },
      { key: 'gender',     label: 'Gender',          type: 'select',      required: false,
        options: [
          { label: 'Men', value: 'men' }, { label: 'Women', value: 'women' },
          { label: 'Unisex', value: 'unisex' }, { label: 'Kids', value: 'kids' },
        ] },
      { key: 'occasion',   label: 'Occasion',        type: 'multiselect', required: false,
        options: [
          { label: 'Casual / Daily Wear',  value: 'casual' },
          { label: 'Formal',               value: 'formal' },
          { label: 'Wedding / Bridal',     value: 'wedding' },
          { label: 'Festive / Ethnic',     value: 'festive' },
          { label: 'Party',                value: 'party' },
          { label: 'Gift',                 value: 'gift' },
        ] },
    ],
  },

  // ── 14. Pet Supplies (new) ────────────────────────────────────────────────────
  {
    name: 'Pet Supplies',
    slug: 'pet-supplies',
    sortOrder: 14,
    attributeSchema: [
      { key: 'pet_type',      label: 'Pet Type',          type: 'select',   required: true,
        options: [
          { label: 'Dog',               value: 'dog' },
          { label: 'Cat',               value: 'cat' },
          { label: 'Bird',              value: 'bird' },
          { label: 'Fish / Aquatic',    value: 'fish' },
          { label: 'Rabbit / Hamster',  value: 'rabbit' },
          { label: 'All Pets',          value: 'all' },
          { label: 'Other',             value: 'other' },
        ] },
      { key: 'product_type',  label: 'Product Category',  type: 'select',   required: false,
        options: [
          { label: 'Food / Treats',     value: 'food' },
          { label: 'Grooming',          value: 'grooming' },
          { label: 'Toys',              value: 'toys' },
          { label: 'Accessories',       value: 'accessories' },
          { label: 'Health / Vitamins', value: 'health' },
          { label: 'Bedding / Housing', value: 'bedding' },
          { label: 'Training Aid',      value: 'training' },
          { label: 'Other',             value: 'other' },
        ] },
      { key: 'brand',         label: 'Brand',             type: 'text',     required: false },
      { key: 'life_stage',    label: 'Life Stage',        type: 'multiselect', required: false,
        options: [
          { label: 'Puppy / Kitten',   value: 'puppy' },
          { label: 'Adult',            value: 'adult' },
          { label: 'Senior',           value: 'senior' },
          { label: 'All Life Stages',  value: 'all' },
        ] },
      { key: 'weight',        label: 'Weight / Volume',   type: 'text',     required: false, unit: 'g / ml', isVariant: true, isStockDependent: true },
      { key: 'flavor',        label: 'Flavor / Variant',  type: 'text',     required: false, isVariant: true },
      { key: 'ingredients',   label: 'Key Ingredients',   type: 'textarea', required: false },
    ],
  },

  // ── 15. Baby & Kids (new) ─────────────────────────────────────────────────────
  {
    name: 'Baby & Kids',
    slug: 'baby-kids',
    sortOrder: 15,
    attributeSchema: [
      { key: 'brand',            label: 'Brand',             type: 'text',        required: false },
      { key: 'age_group',        label: 'Age Group',         type: 'select',      required: true,
        options: [
          { label: '0–6 Months',  value: '0_6m' },  { label: '6–12 Months', value: '6_12m' },
          { label: '1–2 Years',   value: '1_2y' },  { label: '2–3 Years',   value: '2_3y' },
          { label: '3–5 Years',   value: '3_5y' },  { label: '5–8 Years',   value: '5_8y' },
          { label: '8–12 Years',  value: '8_12y' }, { label: 'All Ages',     value: 'all' },
        ] },
      { key: 'gender',           label: 'Gender',            type: 'select',      required: false,
        options: [
          { label: 'Boys', value: 'boys' }, { label: 'Girls', value: 'girls' }, { label: 'Unisex', value: 'unisex' },
        ] },
      { key: 'product_type',     label: 'Product Type',      type: 'select',      required: false,
        options: [
          { label: 'Clothing',           value: 'clothing' },
          { label: 'Footwear',           value: 'footwear' },
          { label: 'Diapering',          value: 'diapering' },
          { label: 'Feeding',            value: 'feeding' },
          { label: 'Bathing / Skincare', value: 'bathing' },
          { label: 'Gear / Travel',      value: 'gear' },
          { label: 'Nursery',            value: 'nursery' },
          { label: 'Toys',               value: 'toys' },
          { label: 'Other',              value: 'other' },
        ] },
      { key: 'color',            label: 'Color',             type: 'color',       required: false, isVariant: true,
        options: [
          { label: 'White',  value: 'white' }, { label: 'Pink',   value: 'pink' },
          { label: 'Blue',   value: 'blue' }, { label: 'Yellow', value: 'yellow' },
          { label: 'Green',  value: 'green' }, { label: 'Red',    value: 'red' },
          { label: 'Peach',  value: 'peach' }, { label: 'Multi',  value: 'multi' },
        ] },
      { key: 'material',         label: 'Material',          type: 'text',        required: false },
      { key: 'size',             label: 'Size',              type: 'text',        required: false, isVariant: true, isStockDependent: true },
      { key: 'safety_certified', label: 'Safety Certified',  type: 'select',      required: false,
        options: [
          { label: 'Yes – BIS / IS Certified', value: 'bis' },
          { label: 'Yes – CE Certified',       value: 'ce' },
          { label: 'Not Applicable',           value: 'na' },
        ] },
    ],
  },

  // ── 16. Other ─────────────────────────────────────────────────────────────────
  {
    name: 'Other',
    slug: 'other',
    sortOrder: 99,
    attributeSchema: [],
  },
];

const NEW_SLUGS = [
  'furniture-decor',
  'automotive',
  'toys-games',
  'jewellery-accessories',
  'pet-supplies',
  'baby-kids',
];

// Original schemas from migration 20260519000001 — used to restore on down
const ORIGINAL_SCHEMAS: Record<string, AttributeField[]> = {
  'grocery': [
    { key: 'brand',   label: 'Brand',           type: 'text',   required: false },
    { key: 'weight',  label: 'Weight / Volume',  type: 'text',   required: true,  unit: 'g / ml' },
    { key: 'organic', label: 'Organic',          type: 'select', required: false,
      options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
  ],
  'restaurant-food': [
    { key: 'veg', label: 'Veg / Non-Veg', type: 'select', required: true,
      options: [{ label: 'Veg', value: 'veg' }, { label: 'Non-Veg', value: 'non-veg' }, { label: 'Egg', value: 'egg' }] },
    { key: 'weight',      label: 'Weight / Portion', type: 'text',     required: false, unit: 'g / ml' },
    { key: 'ingredients', label: 'Ingredients',      type: 'textarea', required: false },
    { key: 'allergens',   label: 'Allergens',         type: 'text',     required: false },
  ],
  'electronics': [
    { key: 'brand',    label: 'Brand',        type: 'text',   required: true },
    { key: 'warranty', label: 'Warranty',      type: 'number', required: false, unit: 'months' },
    { key: 'color',    label: 'Color',         type: 'text',   required: false },
    { key: 'voltage',  label: 'Voltage',       type: 'text',   required: false },
    { key: 'modelNo',  label: 'Model Number',  type: 'text',   required: false },
  ],
  'fashion-clothing': [
    { key: 'sizeType', label: 'Size Type', type: 'select', required: true,
      options: [{ label: 'S / M / L', value: 'alpha' }, { label: '36 – 44 (Numeric)', value: 'numeric' }, { label: 'Kids (Age)', value: 'kids' }] },
    { key: 'sizes', label: 'Available Sizes', type: 'multiselect', required: true,
      options: [
        { label: 'XS', value: 'XS' }, { label: 'S', value: 'S' }, { label: 'M', value: 'M' },
        { label: 'L', value: 'L' }, { label: 'XL', value: 'XL' }, { label: 'XXL', value: 'XXL' },
        { label: '36', value: '36' }, { label: '38', value: '38' }, { label: '40', value: '40' },
        { label: '42', value: '42' }, { label: '44', value: '44' },
        { label: '2Y', value: '2Y' }, { label: '4Y', value: '4Y' }, { label: '6Y', value: '6Y' },
        { label: '8Y', value: '8Y' }, { label: '10Y', value: '10Y' }, { label: '12Y', value: '12Y' },
      ] },
    { key: 'colors', label: 'Available Colors', type: 'color', required: false,
      options: [
        { label: 'Black', value: 'black' }, { label: 'White', value: 'white' },
        { label: 'Red', value: 'red' }, { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' }, { label: 'Yellow', value: 'yellow' },
        { label: 'Pink', value: 'pink' }, { label: 'Beige', value: 'beige' },
        { label: 'Brown', value: 'brown' }, { label: 'Grey', value: 'grey' },
        { label: 'Orange', value: 'orange' }, { label: 'Purple', value: 'purple' },
      ] },
    { key: 'material',         label: 'Material / Composition', type: 'text',     required: false },
    { key: 'careInstructions', label: 'Care Instructions',      type: 'textarea', required: false },
    { key: 'countryOfOrigin',  label: 'Country of Origin',      type: 'text',     required: false },
  ],
  'pharmacy': [
    { key: 'manufacturer', label: 'Manufacturer',      type: 'text',     required: true },
    { key: 'dosage',       label: 'Dosage / Strength', type: 'text',     required: false },
    { key: 'composition',  label: 'Composition',       type: 'textarea', required: false },
    { key: 'expiryNote',   label: 'Expiry / Shelf Life', type: 'text',  required: false },
  ],
  'beauty-personal-care': [
    { key: 'brand',       label: 'Brand',           type: 'text',     required: true },
    { key: 'volume',      label: 'Volume / Weight', type: 'text',     required: true, unit: 'ml / g' },
    { key: 'skinType',    label: 'Suitable For',    type: 'text',     required: false },
    { key: 'ingredients', label: 'Key Ingredients', type: 'textarea', required: false },
    { key: 'usage',       label: 'How to Use',      type: 'textarea', required: false },
  ],
  'home-kitchen': [
    { key: 'material',   label: 'Material',   type: 'text',   required: false },
    { key: 'dimensions', label: 'Dimensions', type: 'text',   required: false },
    { key: 'color',      label: 'Color',      type: 'text',   required: false },
    { key: 'brand',      label: 'Brand',      type: 'text',   required: false },
    { key: 'warranty',   label: 'Warranty',   type: 'number', required: false, unit: 'months' },
  ],
  'sports-fitness': [
    { key: 'brand',    label: 'Brand',    type: 'text', required: false },
    { key: 'size',     label: 'Size',     type: 'text', required: false },
    { key: 'material', label: 'Material', type: 'text', required: false },
    { key: 'color',    label: 'Color',    type: 'text', required: false },
    { key: 'weight',   label: 'Weight',   type: 'text', required: false, unit: 'kg' },
  ],
  'books-stationery': [
    { key: 'author',    label: 'Author',    type: 'text',   required: false },
    { key: 'publisher', label: 'Publisher', type: 'text',   required: false },
    { key: 'isbn',      label: 'ISBN',      type: 'text',   required: false },
    { key: 'language',  label: 'Language',  type: 'text',   required: false },
    { key: 'pages',     label: 'Pages',     type: 'number', required: false },
    { key: 'edition',   label: 'Edition',   type: 'text',   required: false },
  ],
  'other': [],
};

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    for (const cat of CATEGORIES) {
      await queryInterface.sequelize.query(
        `INSERT INTO categories (name, slug, is_active, sort_order, attribute_schema, created_at, updated_at)
         VALUES (:name, :slug, TRUE, :sortOrder, :schema::jsonb, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE SET
           attribute_schema = EXCLUDED.attribute_schema,
           sort_order       = EXCLUDED.sort_order,
           updated_at       = NOW()`,
        {
          replacements: {
            name:      cat.name,
            slug:      cat.slug,
            sortOrder: cat.sortOrder,
            schema:    JSON.stringify(cat.attributeSchema),
          },
          transaction: t,
        },
      );
    }
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    const slugList = NEW_SLUGS.map(s => `'${s}'`).join(', ');
    await queryInterface.sequelize.query(
      `DELETE FROM categories WHERE slug IN (${slugList})`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `UPDATE categories SET sort_order = 10, updated_at = NOW() WHERE slug = 'other'`,
      { transaction: t },
    );

    for (const [slug, schema] of Object.entries(ORIGINAL_SCHEMAS)) {
      await queryInterface.sequelize.query(
        `UPDATE categories SET attribute_schema = :schema::jsonb, updated_at = NOW() WHERE slug = :slug`,
        { replacements: { schema: JSON.stringify(schema), slug }, transaction: t },
      );
    }
  });
}

export { up, down };
