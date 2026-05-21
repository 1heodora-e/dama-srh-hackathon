import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TopNav from "../components/TopNav";

const MAX_MESSAGES = 20;
import { API_BASE } from "../lib/api";

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

function containsFacilityReferral(text) {
  const lowered = (text || "").toLowerCase();
  return lowered.includes("csps") || lowered.includes("find a facility");
}

export default function Learn() {
  const [activeTab, setActiveTab] = useState("ask");
  const [languageMode, setLanguageMode] = useState("auto");
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
      const response = await fetch(`${API_BASE}/api/sira/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextHistory,
          language_mode: languageMode,
        }),
      });

      if (!response.ok) {
        let errorDetail = "Failed to get Sira response.";
        try {
          const errorJson = await response.json();
          errorDetail = errorJson?.detail || errorDetail;
        } catch {
          const errorText = await response.text();
          if (errorText) errorDetail = errorText;
        }
        throw new Error(errorDetail);
      }

      const payload = await response.json();
      const assistantText = payload?.response?.trim();
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
                  <div className="sira-controls">
                    <div className="sira-language-switch" role="group" aria-label="Sira language mode">
                      <button
                        type="button"
                        className={`sira-lang-btn ${languageMode === "auto" ? "active" : ""}`}
                        onClick={() => setLanguageMode("auto")}
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        className={`sira-lang-btn ${languageMode === "fr" ? "active" : ""}`}
                        onClick={() => setLanguageMode("fr")}
                      >
                        Francais
                      </button>
                      <button
                        type="button"
                        className={`sira-lang-btn ${languageMode === "en" ? "active" : ""}`}
                        onClick={() => setLanguageMode("en")}
                      >
                        English
                      </button>
                    </div>
                    <button type="button" className="btn-secondary" onClick={resetConversation}>
                      Start new conversation
                    </button>
                  </div>
                </div>
                <p className="sira-language-note">
                  Language:{" "}
                  {languageMode === "auto"
                    ? "Auto follows the language you use."
                    : languageMode === "fr"
                      ? "Forced French responses."
                      : "Forced English responses."}
                </p>

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
