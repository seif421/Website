import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "ar";

const translations: Record<string, string> = {
  Home: "الرئيسية",
  Shop: "تسوق",
  About: "من نحن",
  Contact: "اتصل بنا",
  "All categories": "كل الفئات",
  "View all": "عرض الكل",
  "No categories yet.": "لا توجد فئات بعد.",
  "No products in this category yet.": "لا توجد منتجات في هذه الفئة بعد.",
  "Loading…": "جارٍ التحميل…",
  "Search products…": "ابحث عن المنتجات…",
  "Search products": "ابحث عن المنتجات",
  Account: "حسابي",
  "Sign in": "تسجيل الدخول",
  Wishlist: "قائمة المفضلة",
  Cart: "سلة التسوق",
  Admin: "الإدارة",
  "Added to cart": "تمت الإضافة إلى السلة",
  "Add to cart": "أضف إلى السلة",
  "Out of stock": "غير متوفر",
  "Best Seller": "الأكثر مبيعًا",
  New: "جديد",
  Save: "وفر",
  review: "تقييم",
  reviews: "تقييمات",
  "Back to top": "العودة للأعلى",
  Support: "الدعم",
  "Help Center": "مركز المساعدة",
  "Shipping Policy": "سياسة الشحن",
  "Refund Policy": "سياسة الاسترداد",
  "Return Request": "طلب إرجاع",
  "Contact Us": "اتصل بنا",
  Company: "الشركة",
  "Privacy Policy": "سياسة الخصوصية",
  "Terms of Service": "شروط الخدمة",
  "All products": "كل المنتجات",
  "All rights reserved.": "جميع الحقوق محفوظة.",
  "Need help?": "هل تحتاج إلى مساعدة؟",
  "Contact us": "تواصل معنا",
  "Send a message to the Rivvo team.": "أرسل رسالة إلى فريق Rivvo.",
  "Your name": "اسمك",
  Email: "البريد الإلكتروني",
  "Order number": "رقم الطلب",
  "(optional)": "(اختياري)",
  Message: "الرسالة",
  "Send message": "إرسال الرسالة",
  "Sending…": "جارٍ الإرسال…",
  "Thank you, your message was sent.": "شكرًا لك، تم إرسال رسالتك.",
  "We will reply to the email address you gave us.":
    "سنرد على عنوان البريد الإلكتروني الذي أدخلته.",
  "Sorry, the message could not be sent. Please try again in a moment.":
    "عذرًا، تعذر إرسال الرسالة. يرجى المحاولة مرة أخرى بعد قليل.",
  "Email:": "البريد الإلكتروني:",
  "WhatsApp:": "واتساب:",
  "Phone:": "الهاتف:",
  "Address:": "العنوان:",
  "Hours:": "ساعات العمل:",
  "Page not found": "الصفحة غير موجودة",
  "The page you're looking for doesn't exist or has been moved.":
    "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
  "Go home": "العودة للرئيسية",
  "This page didn't load": "تعذر تحميل الصفحة",
  "Something went wrong on our end. You can try refreshing or head back home.":
    "حدث خطأ من جانبنا. يمكنك تحديث الصفحة أو العودة إلى الرئيسية.",
  "Try again": "حاول مرة أخرى",
  Search: "بحث",
  All: "الكل",
  Filter: "تصفية",
  Sort: "ترتيب",
  Price: "السعر",
  Category: "الفئة",
  Description: "الوصف",
  Features: "المميزات",
  Specifications: "المواصفات",
  Reviews: "التقييمات",
  "Related products": "منتجات ذات صلة",
  "Continue shopping": "متابعة التسوق",
  "Your cart is empty": "سلة التسوق فارغة",
  "Proceed to checkout": "إتمام الشراء",
  Checkout: "إتمام الطلب",
  Subtotal: "المجموع الفرعي",
  Shipping: "الشحن",
  Total: "الإجمالي",
  Quantity: "الكمية",
  Remove: "حذف",
  "Update cart": "تحديث السلة",
  Apply: "تطبيق",
  "Coupon code": "كود الخصم",
  "Order summary": "ملخص الطلب",
  "Cash on delivery": "الدفع عند الاستلام",
  "Place order": "تأكيد الطلب",
  "First name": "الاسم الأول",
  "Last name": "اسم العائلة",
  "Phone number": "رقم الهاتف",
  City: "المدينة",
  Area: "المنطقة",
  "Street address": "عنوان الشارع",
  "Delivery address": "عنوان التوصيل",
  "Payment method": "طريقة الدفع",
  "Track order": "تتبع الطلب",
  "My account": "حسابي",
  "My orders": "طلباتي",
  "Log out": "تسجيل الخروج",
  "Sign out": "تسجيل الخروج",
  "Create account": "إنشاء حساب",
  Password: "كلمة المرور",
  "Forgot password?": "هل نسيت كلمة المرور؟",
  "Welcome back": "مرحبًا بعودتك",
  "Create your account": "أنشئ حسابك",
  "Save changes": "حفظ التغييرات",
  FAQ: "الأسئلة الشائعة",
  "Why shop with us": "لماذا تتسوق معنا",
  "New arrivals": "وصل حديثًا",
  "Best sellers": "الأكثر مبيعًا",
  Deals: "العروض",
  "Browse by categories": "تسوق حسب الفئة",
  "Curated picks for you": "اختيارات مميزة لك",
  "Questions, answered.": "إجابات على أسئلتك.",
  "Confirmed by phone": "تأكيد الطلب عبر الهاتف",
  "Real people": "خدمة عملاء حقيقية",
  "Shop online in Egypt and pay when your order arrives.":
    "تسوق عبر الإنترنت في مصر وادفع عند استلام طلبك.",
  "Shop smarter, live better.": "تسوق بذكاء، عش أفضل.",
  "Discover products you'll love, delivered to your door.":
    "اكتشف منتجات ستعجبك، تصلك حتى باب منزلك.",
  "View product": "عرض المنتج",
  Continue: "متابعة",
  Cancel: "إلغاء",
  Edit: "تعديل",
  Delete: "حذف",
  "In stock": "متوفر",
  Unavailable: "غير متاح",
  "Sort by": "ترتيب حسب",
  Newest: "الأحدث",
  "Price: low to high": "السعر: من الأقل للأعلى",
  "Price: high to low": "السعر: من الأعلى للأقل",
  "Highest rated": "الأعلى تقييمًا",
  Previous: "السابق",
  Next: "التالي",
  Page: "صفحة",
  of: "من",
  Showing: "عرض",
  results: "نتيجة",
  "No results found": "لم يتم العثور على نتائج",
  "Select language": "اختر اللغة",
};

export function translateStoreText(value: string, language: Language): string {
  if (language === "en") return value;
  const trimmed = value.trim();
  const translated = translations[trimmed];
  return translated ? value.replace(trimmed, translated) : value;
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("rivvo-language");
    if (saved === "ar" || saved === "en") setLanguageState(saved);
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem("rivvo-language", next);
  };
  const toggleLanguage = () => setLanguage(language === "en" ? "ar" : "en");

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
