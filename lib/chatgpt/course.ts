export type ChatGPTLesson = {
  id: string;
  title: string;
  group: string;
  minutes: number;
  goal: string;
  steps: string[];
  prompt: string;
  exercise: string;
  hint: string;
  review: string[];
  quiz: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  };
  reference: { title: string; url: string };
};

const openAiPrompting = {
  title: "OpenAI · Prompting best practices",
  url: "https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt",
};
const microsoftCopilot = {
  title: "Microsoft · Copilot in Microsoft 365",
  url: "https://support.microsoft.com/en-us/microsoft-365-copilot/copilot-in-microsoft-365-personal-family-and-premium",
};
const canvaAi = {
  title: "Canva · Use Canva AI",
  url: "https://www.canva.com/help/ai-tools-pages/",
};

export const courseReviewed = "8 October 2026";

export const chatgptLessons: ChatGPTLesson[] = [
  {
    id: "getting-started",
    title: "AI without the jargon",
    group: "AI made simple",
    minutes: 30,
    goal: "Explain generative AI simply and know when human checking is required.",
    steps: [
      "Generative AI is software that creates responses by finding patterns in data. It can draft, summarise, brainstorm, explain and transform information, but it does not think or understand exactly as a person does.",
      "AI can sound confident and still be wrong. Check important facts, prices, policies, calculations, references and any legal, medical or financial information before acting on it.",
      "Protect private information. Never paste passwords, banking PINs, private customer data or confidential company information into an AI tool unless your organisation has approved that use.",
      "Features vary between products, accounts and plans. If a button shown by a trainer is missing, check the account, licence and organisation settings rather than assuming you have made a mistake.",
    ],
    prompt:
      "Explain generative AI to me as a complete beginner. Avoid jargon. Give me three everyday tasks it can help with, two things it cannot be trusted to do alone, and one short safety reminder.",
    exercise:
      "List three repetitive everyday or work tasks you would like AI to make easier. For each one, note what a person must still check.",
    hint: "Think about writing, organising, summarising, planning or explaining.",
    review: [
      "The tasks are specific and useful to you.",
      "A human check is named for every task.",
      "No confidential information is included.",
    ],
    quiz: {
      question: "Which statement about generative AI is safest?",
      options: [
        "A confident answer is always correct",
        "AI can create useful drafts, but important information still needs checking",
        "AI should receive every available company record",
      ],
      correct: 1,
      explanation: "AI is useful for creating and transforming content, but people remain responsible for checking important output.",
    },
    reference: openAiPrompting,
  },
  {
    id: "emails",
    title: "ChatGPT for everyday life",
    group: "Use the tools",
    minutes: 50,
    goal: "Use ChatGPT for practical writing, planning, learning and working with information.",
    steps: [
      "Start a new chat and give a clear instruction. ChatGPT can help draft professional emails, WhatsApps, letters and customer replies, then improve grammar, tone and clarity.",
      "Use it to summarise text or permitted documents, plan shopping lists, schedules, events and travel, brainstorm ideas and compare choices. Give the facts and limits that the result must respect.",
      "Upload a file or image when that feature is available and the information is safe to share. Explain what you want done with the file; an attachment by itself is not an instruction.",
      "Improve the result with follow-up requests such as ‘make it friendlier’, ‘use simpler English’ or ‘keep it under 100 words’. Review the final version before sending or using it.",
    ],
    prompt:
      "Act as a professional customer-service assistant. Rewrite the message below so it is clear, friendly and professional. Keep it under 100 words. Preserve the facts and do not invent a delivery promise. Message: Hi stock late maybe Friday will let you know.",
    exercise:
      "Turn the rough stock message into a professional customer reply. Then ask ChatGPT for a friendlier version and compare the two.",
    hint: "Tell ChatGPT what must stay accurate as well as what tone you want.",
    review: [
      "The reply is clear, friendly and professional.",
      "Friday is presented as uncertain, not guaranteed.",
      "The final message contains a sensible next step.",
    ],
    quiz: {
      question: "The first response sounds too formal. What should you do?",
      options: [
        "Send it unchanged",
        "Ask for a friendlier version in the same chat",
        "Remove all the facts",
      ],
      correct: 1,
      explanation: "A focused follow-up can improve tone while keeping the useful context from the conversation.",
    },
    reference: openAiPrompting,
  },
  {
    id: "clear-prompts",
    title: "Prompting that works",
    group: "Use the tools",
    minutes: 45,
    goal: "Give AI enough context to produce useful results consistently.",
    steps: [
      "Use the five-part formula: ROLE + TASK + INFORMATION + REQUIREMENTS + OUTPUT. You do not need every part for every request, but each useful detail reduces guessing.",
      "State the audience, tone and length. Provide examples or reliable source material when accuracy matters, and clearly separate instructions from the material being transformed.",
      "Request the format you need: a table, checklist, email, steps or summary. Ask the tool to identify missing information instead of inventing it.",
      "Refine instead of starting over. Try ‘make it shorter’, ‘use simpler English’, ‘add three examples’ or ‘keep the dates unchanged’.",
    ],
    prompt:
      "You are a [ROLE]. Help me [TASK]. Here is the information: [INFORMATION]. Follow these requirements: [REQUIREMENTS]. Return the answer as [OUTPUT]. Ask me about any essential missing facts instead of inventing them.",
    exercise:
      "Write one weak prompt, then rebuild it using the five-part formula. Try both and note which parts improved the result.",
    hint: "Begin with the task, then add the reader, facts, limits and desired format.",
    review: [
      "The task and audience are clear.",
      "The information and requirements are specific.",
      "The requested output format is named.",
    ],
    quiz: {
      question: "Which prompt gives the most useful direction?",
      options: [
        "Write something good",
        "Write a friendly 80-word customer email using these confirmed delivery details",
        "Be clever",
      ],
      correct: 1,
      explanation: "It gives the task, audience, tone, length and source information.",
    },
    reference: openAiPrompting,
  },
  {
    id: "microsoft-copilot",
    title: "Microsoft Copilot",
    group: "Use the tools",
    minutes: 45,
    goal: "Use Copilot for common Microsoft and web tasks while recognising that availability varies.",
    steps: [
      "Copilot can help with questions, drafting, summarising and ideas. In supported Microsoft 365 experiences it can assist with Word documents, Outlook communication, Excel analysis, PowerPoint creation and Teams work.",
      "Ask Copilot to explain an Excel formula before using it. Check the formula, cell references and result in your own workbook rather than assuming the generated answer is correct.",
      "Use your organisation’s approved Microsoft account for work information. Product access depends on the Microsoft product, account and licence available to you.",
      "Review generated emails, documents, formulas and presentations before sending or publishing. Confirm names, numbers, dates and promises against the source.",
    ],
    prompt:
      "Rewrite the following information for a customer. Use plain English, keep all important facts, and finish with one clear next step. Then provide a shorter version with three bullet points. Information: [paste approved information].",
    exercise:
      "Take a short non-confidential paragraph and ask Copilot to rewrite it for a customer. Then request a shorter version with three bullet points.",
    hint: "Compare both versions with the source and mark any fact that changed.",
    review: [
      "All important source facts remain correct.",
      "The language is suitable for the customer.",
      "The next step is clear and achievable.",
    ],
    quiz: {
      question: "What should you do with a formula suggested by Copilot?",
      options: [
        "Use it without opening the workbook",
        "Ask for an explanation and verify the formula and result",
        "Assume every Microsoft account has the same features",
      ],
      correct: 1,
      explanation: "Generated formulas and analysis need to be understood and checked in the actual workbook.",
    },
    reference: microsoftCopilot,
  },
  {
    id: "canva-design",
    title: "Canva for everyday design",
    group: "Create with confidence",
    minutes: 50,
    goal: "Create clean visual material without professional design experience.",
    steps: [
      "Choose the correct format first: presentation, social post, flyer, poster or business card. The destination determines the shape, amount of text and export choice.",
      "Start from a suitable template and replace its content rather than overcrowding it. Keep a small, consistent set of fonts and colours and leave enough whitespace.",
      "Upload approved logos and photographs. Canva writing, design and image assistance may be available depending on your account and plan; treat generated material as a draft.",
      "Export for the destination. Screen and social sharing have different needs from professional printing. Reopen the exported file and check text, crop, quality and contact details.",
    ],
    prompt:
      "Create concise copy for a promotional flyer about [offer]. Give me one short headline, a benefit statement, three services and a clear call to action. Audience: [audience]. Tone: [tone]. Use only these confirmed details: [details].",
    exercise:
      "Create a simple promotional flyer with a headline, short benefit statement, three services and a call to action. Use a template and keep the layout uncluttered.",
    hint: "If everything is large and bold, nothing stands out. Choose one clear headline.",
    review: [
      "The design format suits its destination.",
      "Fonts, colours and spacing are consistent.",
      "Names, prices and contact details are correct.",
    ],
    quiz: {
      question: "What is the best way to begin a simple Canva flyer?",
      options: [
        "Add as many fonts and colours as possible",
        "Choose the correct format and adapt a suitable template",
        "Fill every empty space",
      ],
      correct: 1,
      explanation: "A suitable format and restrained template provide a clear, usable starting point.",
    },
    reference: canvaAi,
  },
  {
    id: "combined-workflow",
    title: "Use the tools together",
    group: "Create with confidence",
    minutes: 50,
    goal: "Build a repeatable workflow from an idea to business-ready output.",
    steps: [
      "Use ChatGPT to develop or improve wording and structure. Start from one approved brief containing the correct names, dates, prices and contact details.",
      "Use Copilot with Microsoft documents, email, spreadsheets or presentations where appropriate and where your account provides access.",
      "Use Canva to turn the final approved message into polished visual communication. Avoid changing key facts while adapting the text to the design.",
      "Keep one approved source of truth and perform a final human check before sending, posting or printing. The workflow is complete only when every output agrees with that source.",
    ],
    prompt:
      "Help me prepare a customer communication pack from the approved brief below. First list any missing essentials. Then create: 1) a friendly customer reply, 2) a one-page service-summary outline for Word, and 3) concise copy for a square Canva social post. Keep names, dates, prices and contact details consistent. Brief: [paste approved brief].",
    exercise:
      "Scenario: a customer asks about a new service. Draft the reply in ChatGPT, prepare a one-page summary in Word with Copilot where available, then design a social post in Canva.",
    hint: "Return to the same approved brief before accepting each new output.",
    review: [
      "Every output uses the same approved facts.",
      "Each tool is used for a task it handles well.",
      "The final files have been opened and checked.",
    ],
    quiz: {
      question: "What keeps a three-tool workflow consistent?",
      options: [
        "A single approved source of truth",
        "Letting each tool invent missing prices",
        "Using a different audience for every output",
      ],
      correct: 0,
      explanation: "One approved brief helps prevent names, dates, prices and contact details from drifting between outputs.",
    },
    reference: openAiPrompting,
  },
  {
    id: "safety-privacy",
    title: "Safety, privacy and fact-checking",
    group: "Use AI responsibly",
    minutes: 45,
    goal: "Use AI responsibly and recognise what should never be delegated blindly.",
    steps: [
      "Do not treat AI output as automatically true. Verify important facts using trustworthy original or authoritative sources.",
      "Do not upload confidential information without permission. Remove unnecessary personal information and follow company policy when work data is involved.",
      "Watch for fake images, invented references and misleading summaries. Open cited sources and compare summaries with the original material.",
      "Keep human responsibility for decisions that materially affect people. AI can support a decision, but it should not silently become the accountable decision-maker.",
    ],
    prompt:
      "Review the answer below for risk. Create three sections: Claims to verify, Private or confidential information to remove, and Decisions that need a responsible person. Do not decide whether a claim is true unless a trustworthy source is supplied. Answer: [paste answer].",
    exercise:
      "Review an AI-generated answer and highlight every statement that should be verified before someone acts on it.",
    hint: "Pay special attention to names, dates, prices, policies, calculations and advice that could affect a person.",
    review: [
      "Important claims are marked for verification.",
      "Private or confidential information is removed.",
      "A person remains responsible for consequential decisions.",
    ],
    quiz: {
      question: "Which information should not be pasted into an unapproved AI tool?",
      options: [
        "A fictional practice sentence",
        "A public event description",
        "Customer records, passwords or confidential company information",
      ],
      correct: 2,
      explanation: "Sensitive personal, security and company information must be protected and handled according to policy.",
    },
    reference: openAiPrompting,
  },
  {
    id: "reusable-templates",
    title: "Everyday prompt library",
    group: "Use AI responsibly",
    minutes: 35,
    goal: "Adapt reusable prompts for common everyday tasks and apply a final safety check.",
    steps: [
      "Email: ‘Write a professional email to [person] about [topic]. Include [facts]. Tone: friendly and professional. Keep it under [length].’",
      "Explain or summarise: ask for beginner-friendly language, practical examples, key points and actions. Tell the tool not to add facts that are absent from the source.",
      "Compare or plan: name the use case and constraints. Request a table for cost, benefits, limitations and best fit, or a priority-ordered plan that respects your time and budget.",
      "For Excel or Canva, name the exact task and requested output. Before using any answer, check accuracy, privacy, tone, names, dates, prices and contact details—and take responsibility for the result.",
    ],
    prompt:
      "Create a step-by-step plan for [goal]. I have [time, budget and constraints]. Put the actions in priority order. Identify any information you still need, do not invent costs or dates, and finish with a checklist I can use to review the plan.",
    exercise:
      "Choose two templates—email, explain, summarise, compare, plan, Excel help or Canva copy. Replace every placeholder, test them and save the versions that work.",
    hint: "A reusable template still needs fresh, accurate facts every time you use it.",
    review: [
      "Every placeholder has been replaced.",
      "The format matches the task.",
      "Accuracy, privacy, tone and key details were checked.",
      "You would be comfortable taking responsibility for the output.",
    ],
    quiz: {
      question: "What must happen before you use AI output?",
      options: [
        "Check accuracy, privacy, tone and important details",
        "Assume the template guarantees correctness",
        "Remove the source information",
      ],
      correct: 0,
      explanation: "Templates save time, but the person using the output must still review it carefully.",
    },
    reference: openAiPrompting,
  },
];
