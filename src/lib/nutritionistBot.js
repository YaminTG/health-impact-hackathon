// DEMO ONLY: a rule-based stand-in for a live nutritionist. Fixed example answers
// (not AI, not medical advice) that use the user's own data. In the full product
// this chat would connect to a licensed nutritionist.
import { normalize } from './classify.js';

const AR = '\\u0621-\\u064a';
function words(list) {
  // whole words, Arabic or English, after normalize()
  return new RegExp(`(^|[^a-z${AR}])(?:${list.join('|')})(?![a-z${AR}])`);
}

const SYMPTOMS = words([
  'دم', 'نزيف', 'blood', 'bleeding', 'نزول وزن', 'خسرت وزن', 'نقص وزن', 'weight loss', 'lost weight', 'losing weight',
  'الم', 'الم البطن', 'وجع', 'pain', 'abdominal', 'براز', 'stool', 'امساك', 'اسهال', 'constipation', 'diarrhea', 'diarrhoea', 'bowel',
]);
const GREETING = words(['مرحبا', 'اهلا', 'السلام', 'هلا', 'hello', 'hi', 'hey']);
const THANKS = words(['شكرا', 'يعطيك', 'thanks', 'thank']);
const BOOKING = words(['موعد', 'احجز', 'حجز', 'استشاره', 'book', 'appointment', 'consultation', 'consult']);
const SCREENING = words(['فحص', 'تنظير', 'screening', 'fit', 'colonoscopy', 'checkup', 'check']);
const FIBRE = words(['الياف', 'fibre', 'fiber', 'wholegrain', 'شوفان', 'oats', 'برغل', 'bulgur', 'فريكه', 'freekeh', 'عدس', 'lentils', 'حمص']);
const MEAT = words(['لحم', 'لحوم', 'meat', 'لانشون', 'luncheon', 'مرتديلا', 'mortadella', 'نقانق', 'sausage', 'sausages', 'شاورما', 'shawarma', 'برجر', 'burger']);
const SUGAR = words(['سكر', 'sugar', 'عصير', 'juice', 'غازي', 'كولا', 'cola', 'soda', 'حلويات', 'sweets']);
const MEAL = words(['فطور', 'breakfast', 'غداء', 'lunch', 'عشاء', 'dinner', 'وجبه', 'وجبات', 'meal', 'meals', 'snack', 'سناك']);
const KIDS = words(['اطفال', 'طفل', 'اولاد', 'kids', 'kid', 'children', 'child']);
const COSMETICS = words(['مكياج', 'makeup', 'كحل', 'kohl', 'شامبو', 'shampoo', 'كريم', 'cream', 'cosmetic', 'تجميل']);

const t = (ar, en) => ({ ar, en });

export const QUICK = {
  ar: ['كيف أرفع الألياف؟', 'بدائل اللانشون', 'أفكار سناك صحي', 'أفكار فطور صحي', 'متى أفحص أمعائي؟', 'احجز استشارة'],
  en: ['How do I eat more fibre?', 'Alternatives to luncheon meat', 'Healthy snack ideas', 'Healthy breakfast ideas', 'When should I get screened?', 'Book a consultation'],
};

/**
 * @param {string} input user message
 * @param {{eligible:boolean, age:number, name:string}} ctx
 * @returns {{ text: {ar,en}, card?: 'booking', symptoms?: boolean }}
 */
export function nutritionistReply(input, ctx) {
  const n = normalize(input);
  const name = ctx.name ? ` ${ctx.name}` : '';

  if (SYMPTOMS.test(n))
    return {
      symptoms: true,
      text: t(
        `شكراً لإخباري${name}. هذه الأعراض تحتاج تقييماً طبياً، وليست أمراً يُحَلّ بتغيير الغذاء. يرجى مراجعة طبيبك أو أقرب مركز صحي قريباً. أغلب الأسباب ليست سرطاناً، لكن يجب فحصها.`,
        `Thank you for telling me${name}. These symptoms need a medical check — they aren't something to fix with diet. Please see your doctor or nearest health centre soon. Most causes are not cancer, but they should be checked.`,
      ),
    };

  if (BOOKING.test(n))
    return {
      card: 'booking',
      text: t(
        'بالتأكيد! اختر موعداً للاستشارة المباشرة مع أخصائي تغذية.',
        'Of course! Pick a time for a live consultation with a nutritionist.',
      ),
    };

  if (SCREENING.test(n))
    return {
      text: ctx.eligible
        ? t(
            `بحسب ما سجّلته${name}، أنت مؤهل لفحص الأمعاء. الغذاء الصحي يقلل الخطر، لكن الفحص وحده يكشف الزوائد اللحمية مبكراً. اطلب فحص FIT المنزلي المجاني من الصفحة الرئيسية، أو اسأل طبيبك.`,
            `Based on what you've entered${name}, you're eligible for bowel screening. A healthy diet lowers risk, but only screening finds polyps early. Request the free home FIT kit from the Home screen, or ask your doctor.`,
          )
        : t(
            'يُنصح عادةً ببدء الفحص من عمر 45، أو أبكر إذا كان هناك تاريخ عائلي لسرطان القولون. تحدث مع طبيبك إذا كان لديك قلق.',
            'Screening is usually recommended from age 45, or earlier with a family history of bowel cancer. Talk to your doctor if you have any concern.',
          ),
    };

  if (FIBRE.test(n))
    return {
      text: t(
        'الحبوب الكاملة والألياف تحمي على الأرجح من سرطان القولون؛ ثلاث حصص (90 غ) يومياً مرتبطة بانخفاض الخطر بنحو 17%. أفكار بسيطة: شوفان على الفطور، خبز قمح كامل، فريكة أو برغل بدل الأرز الأبيض، عدس وحمص في الغداء.',
        'Wholegrains and fibre probably protect against colorectal cancer; 3 servings (90 g) a day is linked to about 17% lower risk. Easy ideas: oats at breakfast, wholewheat bread, freekeh or bulgur instead of white rice, lentils and chickpeas at lunch.',
      ),
    };

  if (MEAT.test(n))
    return {
      text: t(
        'اللحوم المصنّعة (لانشون، مرتديلا، نقانق) مصنّفة مسرطنة (المجموعة 1) والخطر مرتبط بتناولها بانتظام، واللحوم الحمراء مسرطنة على الأرجح. لا داعي للقلق من حصة عابرة، لكن اجعلها نادرة. بدائل عملية: تونة بالماء، لبنة وزعتر، حمص، بيض، أو صدر دجاج مشوي.',
        'Processed meats (luncheon, mortadella, sausages) are classified as carcinogenic (Group 1) and the risk is linked to regular intake; red meat is probably carcinogenic. One serving now and then is not a worry, but keep them occasional. Practical swaps: tuna in water, labaneh & za\'atar, hummus, eggs, or grilled chicken.',
      ),
    };

  if (SUGAR.test(n))
    return {
      text: t(
        'المشروبات المحلّاة بالسكر مرتبطة بنمط غذائي أعلى خطراً. بدائل سهلة: ماء، مياه فوارة مع شرائح ليمون ونعنع، أو لبن عيران سادة. وإذا أردت حلوى، اجعل الفاكهة خيارك الأول.',
        'Sugar-sweetened drinks are linked to a higher-risk diet pattern. Easy swaps: water, sparkling water with lemon and mint, or plain ayran. If you want something sweet, make fruit your first choice.',
      ),
    };

  if (KIDS.test(n))
    return {
      text: t(
        'العادات تُبنى مبكراً: قدّم لأطفالك الخبز الأسمر، الفواكه، اللبن السادة والمكسرات (حسب أعمارهم)، وقلّل المشروبات الغازية والنقانق. اجعلها تجربة ممتعة، ودعهم يساعدونك في مسح المنتجات.',
        'Habits are built early: offer wholewheat bread, fruit, plain yoghurt and nuts (as age-appropriate), and cut back on fizzy drinks and sausages. Make it fun — let them help you scan products.',
      ),
    };

  if (COSMETICS.test(n))
    return {
      text: t(
        'أنا أخصائي تغذية، لذلك لا أقيّم مستحضرات التجميل. لكن في التطبيق خاصية فحص المكونات: صوّر ملصق المنتج وسيُنبّهك إن وجد مكوّنات مثل الزئبق أو الرصاص (في بعض أنواع الكحل) أو الفورمالديهايد. وللأسئلة الطبية استشر الصيدلاني أو الطبيب.',
        "I'm a nutritionist, so I don't assess cosmetics. But the app has an ingredient check: photograph the label and it will flag things like mercury, lead (in some kohl) or formaldehyde. For medical questions, ask a pharmacist or doctor.",
      ),
    };

  if (MEAL.test(n))
    return {
      text: t(
        'أفكار ليوم متوازن:\n• الفطور: شوفان بالحليب والفواكه، أو لفة لبنة وزعتر بخبز أسمر.\n• الغداء: مجدرة برغل مع سلطة، أو شوربة عدس.\n• العشاء: دجاج أو سمك مشوي مع فتوش.\n• سناك: قضامة أو مكسرات غير مملحة.',
        'Ideas for a balanced day:\n• Breakfast: oats with milk and fruit, or a labaneh & za\'atar wholewheat wrap.\n• Lunch: bulgur mujaddara with salad, or lentil soup.\n• Dinner: grilled chicken or fish with fattoush.\n• Snack: qudameh or unsalted nuts.',
      ),
    };

  if (THANKS.test(n))
    return { text: t('العفو! أنا هنا لأي سؤال آخر 💚', "You're welcome! I'm here for any other question 💚") };

  if (GREETING.test(n))
    return {
      text: t(
        `أهلاً${name}! 👋 اسألني عن الألياف، بدائل اللحوم المصنّعة، الوجبات الصحية، أو فحص الأمعاء.`,
        `Hello${name}! 👋 Ask me about fibre, swaps for processed meat, healthy meals, or bowel screening.`,
      ),
    };

  return {
    text: t(
      'سؤال جيد! أستطيع مساعدتك في: الألياف، اللحوم المصنّعة، السكر، الوجبات والفحص. لأي سؤال آخر يمكنك حجز استشارة مع أخصائي تغذية الآن.',
      'Good question! I can help with fibre, processed meat, sugar, meals and screening. For anything else, you can book a consultation with a nutritionist now.',
    ),
    card: 'booking',
  };
}
