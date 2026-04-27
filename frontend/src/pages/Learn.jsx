import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MAX_MESSAGES = 20;

const SUGGESTED_QUESTIONS = [
  "Est-ce que c'est normal d'avoir mal pendant mes regles?",
  "Comment fonctionne la contraception?",
  "Qu'est-ce qui se passe lors d'une consultation prenatale?",
  "J'ai peur d'aller au CSPS seule",
  "What happens to my body during puberty?",
  "Is family planning free at the CSPS?",
];

const WEEKLY_FACTS = [
  "In high-vulnerability provinces, only 1 CHW serves about 1,000 women. Find yours in Dama Locator.",
  "Family planning, prenatal care, and postnatal care are free at public CSPS across Burkina Faso.",
  "In conflict-affected areas, reaching an open CSPS early can prevent dangerous pregnancy complications.",
];

const QA_CARDS = [
  {
    id: "pain-period",
    question: "Est-ce normal d'avoir mal pendant mes regles?",
    tag: "Menstruation",
    answerFr:
      "Une douleur legere a moderee pendant les regles est frequente. Mais une douleur tres forte, des vomissements, des vertiges ou une douleur qui empeche d'aller a l'ecole ne sont pas a ignorer. Un Relais Communautaire ou une infirmiere du CSPS peut proposer des solutions simples et gratuites.",
    answerMoore:
      "Zoobo ka paam taaba, ka tol n yelga. Laafi yel nonga ka paam beogo, barka boeend ye. Y wa nonga zanga, y mana paam laafi taore n CSPS.",
    myth: "La douleur pendant les regles est normale et il faut l'accepter",
    fact: "Des douleurs severes meritent une consultation, des traitements gratuits existent au CSPS.",
    cta: "Trouver un CSPS qui offre ce service",
    ctaLink: "/locator",
  },
  {
    id: "contraception-infertile",
    question: "La contraception rend-elle infertile?",
    tag: "Contraception",
    answerFr:
      "Non. Les methodes contraceptives ne rendent pas sterile. Apres l'arret, la fertilite revient generalement vite selon la methode. Au CSPS, vous pouvez choisir une methode adaptee a votre age, votre sante et votre projet de grossesse, gratuitement.",
    myth: "La pilule empeche d'avoir des enfants plus tard",
    fact: "La fertilite revient rapidement apres l'arret de la contraception.",
  },
  {
    id: "prenatal-first-visit",
    question: "Que se passe-t-il lors d'une premiere consultation prenatale?",
    tag: "Grossesse",
    answerFr:
      "La sage-femme vous accueille, verifie votre tension, votre poids et l'evolution de la grossesse. Vous pouvez poser toutes vos questions. On vous explique les prochains rendez-vous, les signes d'alerte et les vitamines utiles. Cette visite est gratuite au CSPS.",
  },
  {
    id: "gbv-csps",
    question: "Est-il securise de parler de violence au CSPS?",
    tag: "Soutien VBG",
    answerFr:
      "Oui. Vous avez le droit d'etre ecoutee, protegee et orientee en confidentialite. Le personnel de sante peut vous aider pour les soins, le soutien psychologique et les references legales. Vous n'avez pas besoin d'etre seule pour demander de l'aide.",
    hotline: "Ligne d'urgence VBG: 16 (selon disponibilite locale)",
    highlight: true,
  },
  {
    id: "puberty-changes",
    question: "Qu'est-ce qui change dans mon corps a la puberte?",
    tag: "Sante adolescente",
    answerFr:
      "La poitrine peut commencer a se developper, les hanches changent, les pertes blanches peuvent apparaitre et les regles debutent. Les emotions aussi peuvent varier. Chaque corps evolue a son rythme, et c'est completement normal.",
  },
  {
    id: "free-services",
    question: "Les services SRH sont-ils vraiment gratuits?",
    tag: "Acces aux soins",
    answerFr:
      "Oui. La planification familiale, le suivi prenatal et postnatal sont gratuits dans les CSPS publics. Si un paiement est demande, vous pouvez demander des explications claires au personnel ou passer par un Relais Communautaire.",
    cta: "Verifier les centres proches",
    ctaLink: "/locator",
  },
];

const MOTHER_CARDS = [
  {
    title: "Prenatal visit schedule",
    text: "Month 1-3: first consultation. Month 4-6: regular blood pressure and fetal checks. Month 7-9: birth plan, warning signs, and referral readiness.",
  },
  {
    title: "Postnatal care: first 6 weeks",
    text: "Week 1: bleeding, fever, and pain check. Week 2-4: breastfeeding support and mood check. Week 6: recovery review and family planning counseling.",
  },
  {
    title: "Nutrition during pregnancy",
    text: "Prefer local foods rich in iron and protein: beans, leafy greens, millet, eggs, fish where available. Ask your CSPS about supplements and anemia prevention.",
  },
];

const WORKER_CARDS = [
  {
    title: "How to use Relay Portal",
    text: "Sync households, log visits, flag SRH needs, and submit referrals in under two minutes per household.",
    link: "/relay",
    linkLabel: "Open Relay Portal",
  },
  {
    title: "Weekly district SRH brief",
    text: "Use radio scripts generated from vulnerability signals to align public messaging and field action.",
    link: "/radio",
    linkLabel: "Open Radio Brief",
  },
  {
    title: "Referral pathway guide",
    text: "Refer immediately for danger signs in pregnancy, severe pain, bleeding, sexual violence, or suspected infection.",
    link: "/locator",
    linkLabel: "Open CSPS Locator",
  },
];

const SIRA_SYSTEM_PROMPT = `You are Sira, a warm and knowledgeable SRH health educator
for women and adolescent girls in Burkina Faso.

Your personality:
- Warm, gentle, non-judgmental - like an older sister or trusted aunt
- Never makes the user feel ashamed or wrong for asking
- Uses simple, clear language - no complex medical jargon
- Acknowledges feelings before giving information
- Always ends responses with a path to action

Your knowledge context:
- You know Burkina Faso's health system deeply
- Primary health centers are called CSPS (Centre de Sante et de Promotion Sociale) - there are ~1,900 across the country
- Community health workers are called Relais Communautaires
- Family planning and maternal care are FREE at all CSPS since 2020
- You know the Dama platform and can refer users to /locator to find their nearest CSPS
- Conflict has closed 500+ facilities in northern regions (Sahel, Est, Nord, Centre-Nord)

Language rules:
- Detect the language the user writes in automatically
- Respond in the SAME language they use
- If they write in Moore or mixed French/Moore, respond warmly in French with simple vocabulary
- If they write in English, respond in English
- Never switch languages mid-conversation unless the user does

Topic boundaries:
- You cover: menstruation, family planning, contraception, pregnancy, prenatal care, postnatal care, GBV support, adolescent health, body changes, reproductive anatomy, STIs, cervical health, maternal nutrition
- For questions needing diagnosis: "I can share information but a CSPS nurse can examine you properly - would you like to find the nearest one open today?"
- For crisis/emergency: immediately provide warmth + direct to nearest CSPS or CHW
- For off-topic questions: gently redirect back to SRH topics
- NEVER make the user feel judged, wrong, or shameful

Response format:
- Keep responses under 150 words
- Use short paragraphs, never dense blocks of text
- End EVERY response with one of:
  -> A follow-up question to keep the conversation going
  -> A gentle suggestion to find a CSPS: "Veux-tu trouver le CSPS le plus proche?"
  -> A reassurance statement
- Use checkmark bullets for lists, never numbered lists
- Occasionally use a warm emoji (🌿 💚 ✨) but sparingly

Privacy statement (say this only on first message):
Begin your very first response with:
"Je suis Sira 🌿 Tu peux me poser n'importe quelle question - je ne sais pas qui tu es et je ne le saurai jamais. Tout ce que tu dis ici reste entre nous."
Then answer their question.

Remember: You are often talking to a scared 15-year-old girl who has never been able to ask these questions out loud before. Be the person she needed.`;

function containsFacilityReferral(text) {
  const lowered = (text || "").toLowerCase();
  return lowered.includes("csps") || lowered.includes("find a facility");
}

function extractAnthropicText(payload) {
  if (!payload?.content || !Array.isArray(payload.content)) return "";
  return payload.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

export default function Learn() {
  const [activeTab, setActiveTab] = useState("ask");
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [expandedCards, setExpandedCards] = useState({});
  const [showMythFact, setShowMythFact] = useState({});
  const [factIndex, setFactIndex] = useState(0);

  const textareaRef = useRef(null);
  const feedRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % WEEKLY_FACTS.length);
    }, 9000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [inputValue]);

  const messageCount = messages.length;
  const canSendMore = messageCount < MAX_MESSAGES && !isSending;

  const conversationHistory = useMemo(
    () => messages.map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  const weeklyFact = WEEKLY_FACTS[factIndex];
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `Dama Sira - This week in Burkina Faso:\n${weeklyFact}\n\nFind your nearest CSPS: /locator`
  )}`;

  const resetConversation = () => {
    setMessages([]);
    setInputValue("");
    setChatError("");
  };

  const submitMessage = async (rawValue) => {
    const text = rawValue.trim();
    if (!text || !canSendMore) return;

    const nextHistory = [...conversationHistory, { role: "user", content: text }];
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInputValue("");
    setChatError("");
    setIsSending(true);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("Missing VITE_ANTHROPIC_API_KEY in your frontend environment.");
      }

      const response = await fetch(ANTHROPIC_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SIRA_SYSTEM_PROMPT,
          messages: nextHistory,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || "Failed to get Sira response.");
      }

      const payload = await response.json();
      const assistantText = extractAnthropicText(payload);
      if (!assistantText) throw new Error("Sira returned an empty response.");

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Sira is temporarily unavailable. Please try again in a moment."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <TopNav />
      <div className="page-shell learn-page">
        <div className="learn-hero">
          <div className="hero-grain learn-hero-grain" />
          <div className="container learn-hero-inner">
            <div className="learn-logo-mark" />
            <h1 className="learn-hero-title">
              Ask anything.
              <br />
              No judgment.
              <br />
              No record.
            </h1>
            <p className="learn-hero-subtitle">
              Sira is here for every question you were too afraid to ask.
            </p>
            <div className="learn-tabs">
              <button
                type="button"
                className={`learn-tab-btn ${activeTab === "ask" ? "active" : ""}`}
                onClick={() => setActiveTab("ask")}
              >
                Ask Sira
              </button>
              <button
                type="button"
                className={`learn-tab-btn ${activeTab === "resources" ? "active" : ""}`}
                onClick={() => setActiveTab("resources")}
              >
                Resources
              </button>
            </div>
          </div>
        </div>

        <div className="container learn-inner">
          {activeTab === "ask" ? (
            <section className="learn-ask-layout">
              <aside className="card sira-left-panel">
                <p className="sira-wordmark">dama sira</p>
                <p className="sira-tagline">Ask anything. Completely anonymous.</p>

                <div className="sira-anon-card">
                  <span className="sira-shield" aria-hidden="true">
                    🛡
                  </span>
                  <div>
                    <p className="sira-anon-title">No login. No history. No judgment.</p>
                    <p className="sira-anon-text">Every conversation starts fresh.</p>
                  </div>
                </div>

                <div className="sira-suggested">
                  <p className="label label-terracotta">Suggested questions</p>
                  {SUGGESTED_QUESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="sira-question-btn"
                      onClick={() => submitMessage(item)}
                      disabled={!canSendMore}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <p className="sira-language">Sira speaks French, Moore and English.</p>
                <Link className="btn-primary sira-locator-btn" to="/locator">
                  Find a CSPS near you →
                </Link>
              </aside>

              <div className="card sira-chat-panel">
                <div className="sira-chat-head">
                  <div className="sira-avatar-wrap">
                    <span className="sira-avatar">🌿</span>
                    <div>
                      <p className="sira-chat-title">Ask Sira</p>
                      <p className="sira-chat-meta">
                        This conversation has {messageCount} messages — starting fresh keeps you anonymous.
                      </p>
                    </div>
                  </div>
                  <button type="button" className="btn-secondary" onClick={resetConversation}>
                    Start new conversation
                  </button>
                </div>

                <div className="sira-feed" ref={feedRef}>
                  {messages.length === 0 && (
                    <div className="sira-empty">
                      <p>
                        Start with any SRH question. Sira will answer gently and clearly, in your language.
                      </p>
                    </div>
                  )}
                  {messages.map((message, index) => {
                    const referralCard =
                      message.role === "assistant" && containsFacilityReferral(message.content);
                    return (
                      <div key={`${message.role}-${index}`} className={`msg-row ${message.role}`}>
                        <div className={`msg-bubble ${message.role}`}>{message.content}</div>
                        {referralCard && (
                          <Link to="/locator" className="sira-referral-card">
                            Find your nearest open CSPS →
                          </Link>
                        )}
                      </div>
                    );
                  })}
                  {isSending && (
                    <div className="msg-row assistant">
                      <div className="msg-bubble assistant typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  )}
                </div>

                {chatError ? <p className="alert alert-error">{chatError}</p> : null}
                {!canSendMore && (
                  <p className="alert alert-info">
                    For privacy, this chat stops at 20 messages. Start a new conversation to continue.
                  </p>
                )}

                <form
                  className="sira-input-wrap"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitMessage(inputValue);
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    className="sira-textarea"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder="Ask Sira anything..."
                    rows={1}
                    disabled={!canSendMore}
                  />
                  <button type="submit" className="btn-primary sira-send" disabled={!canSendMore}>
                    Send
                  </button>
                </form>
                <p className="sira-footnote">Anonymous • Not stored • Not shared</p>
              </div>
            </section>
          ) : (
            <section className="learn-resources">
              <div className="card weekly-spotlight">
                <p className="label label-terracotta">This week in Burkina Faso</p>
                <p className="weekly-fact">{weeklyFact}</p>
                <div className="weekly-actions">
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn-secondary">
                    Share on WhatsApp
                  </a>
                  <Link to="/locator" className="btn-primary">
                    Find your CHW / CSPS
                  </Link>
                </div>
              </div>

              <div className="resource-section">
                <p className="label label-terracotta">Questions girls ask</p>
                <div className="qa-grid">
                  {QA_CARDS.map((card) => {
                    const isOpen = Boolean(expandedCards[card.id]);
                    const showFact = Boolean(showMythFact[card.id]);
                    return (
                      <article key={card.id} className={`card qa-card ${card.highlight ? "qa-card-warm" : ""}`}>
                        <button
                          type="button"
                          className="qa-question-btn"
                          onClick={() => setExpandedCards((prev) => ({ ...prev, [card.id]: !isOpen }))}
                        >
                          <span className="qa-question">{card.question}</span>
                          <span className="qa-tag">{card.tag}</span>
                        </button>
                        {isOpen && (
                          <div className="qa-answer">
                            <p>{card.answerFr}</p>
                            {card.answerMoore ? <p className="qa-moore">Mooré: {card.answerMoore}</p> : null}
                            {card.myth && card.fact ? (
                              <div className="myth-fact">
                                <button
                                  type="button"
                                  className="btn-secondary myth-toggle"
                                  onClick={() =>
                                    setShowMythFact((prev) => ({ ...prev, [card.id]: !showFact }))
                                  }
                                >
                                  {showFact ? "Show myth" : "Show fact"}
                                </button>
                                <p>{showFact ? `Fact: ${card.fact}` : `Myth: ${card.myth}`}</p>
                              </div>
                            ) : null}
                            {card.hotline ? <p className="qa-hotline">{card.hotline}</p> : null}
                            {card.ctaLink ? (
                              <Link to={card.ctaLink} className="btn-ghost qa-link">
                                → {card.cta || "Trouver un CSPS"}
                              </Link>
                            ) : null}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="resource-section">
                <p className="label label-terracotta">For mothers</p>
                <div className="mother-grid">
                  {MOTHER_CARDS.map((item) => (
                    <article key={item.title} className="card mother-card">
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="resource-section worker-section">
                <p className="label label-terracotta">For health workers</p>
                <div className="worker-grid">
                  {WORKER_CARDS.map((item) => (
                    <article key={item.title} className="card worker-card">
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                      <Link className="btn-secondary" to={item.link}>
                        {item.linkLabel}
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
