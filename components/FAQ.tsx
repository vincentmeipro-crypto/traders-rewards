"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const faqData = {
  en: [
    { q: "How do I get started?", a: "Choose your challenge (2-Step or 1-Step), select your account size ($25K to $100K, up to $200K cumulative on Reward accounts), complete payment, and receive your trading account credentials instantly by email." },
    { q: "Is there a time limit to pass the challenge?", a: "No. There is absolutely no time limit on any of our challenges. Trade at your own pace — take days, weeks, or months." },
    { q: "What are the profit targets?", a: "2-Step: Phase 1 requires +10% profit, Phase 2 requires +5% profit. 1-Step: a single phase with a +10% profit target, then you become a Trader Reward." },
    { q: "What are the drawdown rules?", a: "2-Step: maximum 5% daily loss and 10% total loss. 1-Step: maximum 3% daily loss and 10% trailing total loss (EOD)." },
    { q: "What is the minimum number of trading days?", a: "You must trade on at least 5 different calendar days during each phase." },
    { q: "What instruments can I trade?", a: "All available instruments: Forex pairs, Gold, Silver, Oil, Stock Indices, Cryptocurrencies, and Commodities." },
    { q: "Can I trade during news events?", a: "Yes during evaluation. On Reward accounts, trading is suspended 5 minutes before and after major news releases." },
    { q: "Can I hold positions overnight or over the weekend?", a: "Yes. Swing trading is fully permitted with no restrictions." },
    { q: "How and when do I get paid?", a: "First reward available from day 7. After that, every 15 days. Processed within 24-48h via crypto or bank transfer." },
    { q: "What is the profit split?", a: "2-Step Trader Rewards keep 80% of profits. 1-Step Trader Rewards keep 90% of profits." },
  ],
  fr: [
    { q: "Comment démarrer ?", a: "Choisissez votre challenge (2-Step ou 1-Step), sélectionnez la taille de votre compte ($25K à $100K, jusqu'à $200K cumulé en Reward), effectuez le paiement et recevez vos identifiants instantanément par email." },
    { q: "Y a-t-il une limite de temps ?", a: "Non. Il n'y a absolument aucune limite de temps sur nos challenges. Tradez à votre rythme." },
    { q: "Quels sont les objectifs de profit ?", a: "2-Step : Phase 1 = +10%, Phase 2 = +5%. 1-Step : une seule phase à +10%, puis vous devenez Trader Reward." },
    { q: "Quelles sont les règles de drawdown ?", a: "2-Step : 5% perte journalière max et 10% total. 1-Step : 3% journalier et 10% trailing total (EOD)." },
    { q: "Combien de jours de trading minimum ?", a: "Au moins 5 jours calendaires différents par phase." },
    { q: "Quels instruments puis-je trader ?", a: "Tous les instruments : Forex, Or, Argent, Pétrole, Indices boursiers, Cryptomonnaies et Matières premières." },
    { q: "Peut-on trader sur les news ?", a: "Oui pendant l'évaluation. Sur les comptes Reward, le trading est suspendu 5 minutes avant et après les publications majeures." },
    { q: "Puis-je garder des positions overnight ?", a: "Oui. Le swing trading est entièrement autorisé sans restriction." },
    { q: "Comment et quand suis-je payé ?", a: "Première récompense disponible dès le 15ème jour. Ensuite tous les 15 jours. Traitement sous 24-48h via crypto ou virement." },
    { q: "Quel est le partage des profits ?", a: "2-Step : 80% pour le trader. 1-Step : 90% pour le trader. Aucun plafond de gains." },
  ],
  es: [
    { q: "¿Cómo empezar?", a: "Elige tu challenge (2-Step o 1-Step), selecciona el tamaño de cuenta ($25K a $100K, hasta $200K acumulado en cuentas Reward), realiza el pago y recibe tus credenciales al instante por email." },
    { q: "¿Hay límite de tiempo?", a: "No. No hay ningún límite de tiempo en nuestros challenges. Opera a tu ritmo." },
    { q: "¿Cuáles son los objetivos de beneficio?", a: "2-Step: Fase 1 = +10%, Fase 2 = +5%. 1-Step: una sola fase con +10%, luego te conviertes en Trader Reward." },
    { q: "¿Cuáles son las reglas de drawdown?", a: "2-Step: 5% pérdida diaria máx. y 10% total. 1-Step: 3% diario y 10% trailing total (EOD)." },
    { q: "¿Mínimo de días de trading?", a: "Al menos 5 días calendario diferentes por fase." },
    { q: "¿Qué instrumentos puedo operar?", a: "Todos los instrumentos: Forex, Oro, Plata, Petróleo, Índices, Criptomonedas y Materias primas." },
    { q: "¿Puedo operar durante noticias?", a: "Sí durante la evaluación. En cuentas Reward, el trading se suspende 5 minutos antes y después de noticias importantes." },
    { q: "¿Puedo mantener posiciones overnight?", a: "Sí. El swing trading está completamente permitido." },
    { q: "¿Cómo y cuándo me pagan?", a: "Primera recompensa disponible desde el día 7. Después, cada 15 días. Procesado en 24-48h via crypto o transferencia." },
    { q: "¿Cuál es el reparto de beneficios?", a: "2-Step: 80% para el trader. 1-Step: 90% para el trader." },
  ],
  pt: [
    { q: "Como começar?", a: "Escolha seu challenge (2-Step ou 1-Step), selecione o tamanho da conta ($25K a $100K, até $200K acumulado em contas Reward), efetue o pagamento e receba suas credenciais instantaneamente por email." },
    { q: "Há limite de tempo?", a: "Não. Não há absolutamente nenhum limite de tempo nos nossos challenges. Opere no seu ritmo." },
    { q: "Quais são os objetivos de lucro?", a: "2-Step: Fase 1 = +10%, Fase 2 = +5%. 1-Step: uma única fase com +10%, depois você se torna Trader Reward." },
    { q: "Quais são as regras de drawdown?", a: "2-Step: 5% perda diária máx. e 10% total. 1-Step: 3% diário e 10% trailing total (EOD)." },
    { q: "Mínimo de dias de trading?", a: "Pelo menos 5 dias calendário diferentes por fase." },
    { q: "Quais instrumentos posso operar?", a: "Todos os instrumentos: Forex, Ouro, Prata, Petróleo, Índices, Criptomoedas e Commodities." },
    { q: "Posso operar durante notícias?", a: "Sim durante a avaliação. Em contas Reward, o trading é suspenso 5 minutos antes e após publicações importantes." },
    { q: "Posso manter posições overnight?", a: "Sim. O swing trading é totalmente permitido sem restrições." },
    { q: "Como e quando sou pago?", a: "Primeira recompensa disponível a partir do dia 7. Depois, a cada 15 dias. Processado em 24-48h via crypto ou transferência." },
    { q: "Qual é a divisão de lucros?", a: "2-Step: 80% para o trader. 1-Step: 90% para o trader." },
  ],
  de: [
    { q: "Wie starte ich?", a: "Wähle deine Challenge (2-Step oder 1-Step), wähle die Kontogröße ($25K bis $100K, bis zu $200K kumuliert auf Reward-Konten), zahle und erhalte deine Zugangsdaten sofort per E-Mail." },
    { q: "Gibt es ein Zeitlimit?", a: "Nein. Es gibt absolut kein Zeitlimit bei unseren Challenges. Handle in deinem eigenen Tempo." },
    { q: "Was sind die Gewinnziele?", a: "2-Step: Phase 1 = +10%, Phase 2 = +5%. 1-Step: eine einzige Phase mit +10%, dann wirst du Trader Reward." },
    { q: "Was sind die Drawdown-Regeln?", a: "2-Step: max. 5% Tagesverlust und 10% Gesamtverlust. 1-Step: 3% täglich und 8% Trailing-Gesamt (EOD)." },
    { q: "Mindestanzahl an Handelstagen?", a: "Mindestens 5 verschiedene Kalendertage pro Phase." },
    { q: "Welche Instrumente kann ich handeln?", a: "Alle Instrumente: Forex, Gold, Silber, Öl, Indizes, Kryptowährungen und Rohstoffe." },
    { q: "Kann ich bei News-Events handeln?", a: "Ja während der Evaluation. Auf Reward-Konten ist der Handel 5 Minuten vor und nach wichtigen News gesperrt." },
    { q: "Kann ich Positionen über Nacht halten?", a: "Ja. Swing-Trading ist vollständig ohne Einschränkungen erlaubt." },
    { q: "Wie und wann werde ich bezahlt?", a: "Erste Belohnung ab Tag 7. Danach alle 15 Tage. Bearbeitung innerhalb von 24-48h via Krypto oder Überweisung." },
    { q: "Wie ist die Gewinnaufteilung?", a: "2-Step: 80% für den Trader. 1-Step: 90% für den Trader." },
  ],
  tr: [
    { q: "Nasıl başlarım?", a: "Challenge'ınızı seçin (2-Step veya 1-Step), hesap boyutunu seçin ($25K-$100K, Reward hesaplarda kümülatif $200K'ya kadar), ödeme yapın ve kimlik bilgilerinizi anında email ile alın." },
    { q: "Zaman sınırı var mı?", a: "Hayır. Hiçbir challenge'ımızda zaman sınırı yoktur. Kendi hızınızda işlem yapın." },
    { q: "Kar hedefleri nelerdir?", a: "2-Step: Aşama 1 = +%10, Aşama 2 = +%5. 1-Step: +%8 hedefli tek aşama, ardından Trader Reward olursunuz." },
    { q: "Drawdown kuralları nelerdir?", a: "2-Step: Günlük max. %5 kayıp ve %10 toplam. 1-Step: Günlük %3 ve %8 trailing toplam (EOD)." },
    { q: "Minimum işlem günü sayısı?", a: "Her aşamada en az 5 farklı takvim günü." },
    { q: "Hangi araçları işlem yapabilirim?", a: "Tüm araçlar: Forex, Altın, Gümüş, Petrol, Endeksler, Kripto paralar ve Emtialar." },
    { q: "Haber dönemlerinde işlem yapabilir miyim?", a: "Evet, değerlendirme sürecinde. Reward hesaplarda, önemli haberlerden 5 dakika önce ve sonra işlem askıya alınır." },
    { q: "Gecelik pozisyon tutabilir miyim?", a: "Evet. Swing trading kısıtlama olmaksızın tamamen serbesttir." },
    { q: "Nasıl ve ne zaman ödeme alırım?", a: "İlk ödül 7. günden itibaren kullanılabilir. Ardından her 15 günde bir. Kripto veya banka transferi ile 24-48 saat içinde işlenir." },
    { q: "Kar paylaşımı nasıl?", a: "2-Step: Trader için %80. 1-Step: Trader için %90." },
  ],
  ar: [
    { q: "كيف أبدأ؟", a: "اختر تحديك (2-Step أو 1-Step)، حدد حجم حسابك ($25K إلى $100K، حتى $200K متراكم في حسابات Reward)، أكمل الدفع واستلم بيانات الدخول فوراً عبر البريد الإلكتروني." },
    { q: "هل يوجد حد زمني؟", a: "لا. لا يوجد أي حد زمني على تحدياتنا. تداول بوتيرتك الخاصة." },
    { q: "ما هي أهداف الربح؟", a: "2-Step: المرحلة 1 = +10%، المرحلة 2 = +5%. 1-Step: مرحلة واحدة بهدف +10%، ثم تصبح Trader Reward." },
    { q: "ما هي قواعد الـ drawdown؟", a: "2-Step: خسارة يومية 5% وإجمالي 10%. 1-Step: 3% يومياً و10% trailing إجمالي (EOD)." },
    { q: "ما هو الحد الأدنى لأيام التداول؟", a: "5 أيام تقويمية مختلفة على الأقل لكل مرحلة." },
    { q: "ما الأدوات المتاحة للتداول؟", a: "جميع الأدوات: فوركس، ذهب، فضة، نفط، مؤشرات، عملات رقمية وسلع." },
    { q: "هل يمكنني التداول أثناء الأخبار؟", a: "نعم خلال التقييم. في حسابات Reward، يُوقف التداول 5 دقائق قبل وبعد الأخبار الرئيسية." },
    { q: "هل يمكنني الاحتفاظ بالصفقات ليلاً؟", a: "نعم. التداول المتأرجح مسموح به بالكامل دون أي قيود." },
    { q: "كيف ومتى أتقاضى أجري؟", a: "أول مكافأة متاحة من اليوم السابع. بعد ذلك كل 15 يوماً. معالجة خلال 24-48 ساعة عبر كريبتو أو تحويل بنكي." },
    { q: "ما هي نسبة تقسيم الأرباح؟", a: "2-Step: 80% للمتداول. 1-Step: 90% للمتداول." },
  ],
};

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const { T, lang } = useLanguage();
  const items = faqData[lang as keyof typeof faqData] || faqData.en;

  return (
    <section id="faq" style={{ padding: "80px 24px", backgroundColor: "#000000" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#3B82F6", marginBottom: 16 }}>FAQ</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px" }}>
            {lang === "fr" ? "Questions fréquentes" : "Frequently Asked Questions"}
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((item, i) => (
            <div key={i} style={{
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%", textAlign: "left",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "22px 0",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.4 }}>{item.q}</span>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: open === i ? "#3B82F6" : "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>
                  <ChevronDown size={14} color={open === i ? "#000" : "rgba(255,255,255,0.6)"}
                    style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }} />
                </div>
              </button>
              {open === i && (
                <div style={{ paddingBottom: 22, paddingRight: 44 }}>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.75, margin: 0 }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
