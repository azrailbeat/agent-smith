import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-demo-key" });

/**
 * Process document text and generate a summary
 */
export async function summarizeDocument(text: string, language: "ru" | "kz" | "en" = "ru"): Promise<string> {
  const languageInstructions = {
    ru: "на русском языке",
    kz: "на казахском языке",
    en: "на английском языке"
  };

  const prompt = `Пожалуйста, сделайте краткое и содержательное резюме следующего документа ${languageInstructions[language]}. 
  Выделите ключевые пункты, основные решения и сроки, если они есть:

  ${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "Не удалось создать резюме.";
  } catch (error) {
    console.error("Error summarizing document:", error);
    throw new Error(`Не удалось обработать документ: ${error.message}`);
  }
}

/**
 * Analyze audio transcription and extract key information
 */
export async function analyzeTranscription(transcription: string, language: "ru" | "kz" | "en" = "ru"): Promise<{
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: { task: string; assignee?: string; dueDate?: string }[];
}> {
  const prompt = `Проанализируйте следующую стенограмму совещания или аудиозаписи. 
  Выделите основные моменты, принятые решения и необходимые действия. 
  Ответ нужно представить в виде JSON с полями: 
  summary (краткое резюме), keyPoints (массив ключевых моментов), 
  decisions (массив принятых решений), actionItems (массив задач с полями task, assignee, dueDate).
  
  Стенограмма: ${transcription}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      summary: result.summary || "",
      keyPoints: result.keyPoints || [],
      decisions: result.decisions || [],
      actionItems: result.actionItems || []
    };
  } catch (error) {
    console.error("Error analyzing transcription:", error);
    throw new Error(`Не удалось проанализировать стенограмму: ${error.message}`);
  }
}

/**
 * Process user message and generate AI response
 */
export async function processUserMessage(
  userMessage: string, 
  chatHistory: Array<{ role: string; content: string }>,
  language: "ru" | "kz" | "en" = "ru"
): Promise<string> {
  try {
    const systemMessage = {
      role: "system", 
      content: `Вы - Agent Smith, интеллектуальный помощник для государственных служащих Казахстана. 
      Вы должны отвечать коротко, точно и по делу. Ваша задача - помогать анализировать документы, 
      организовывать задачи и предоставлять релевантную информацию.`
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemMessage, ...chatHistory, { role: "user", content: userMessage }],
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Извините, я не смог обработать ваш запрос.";
  } catch (error) {
    console.error("Error processing message:", error);
    throw new Error(`Не удалось обработать сообщение: ${error.message}`);
  }
}

/**
 * Detect language of input text
 */
export async function detectLanguage(text: string): Promise<"ru" | "kz" | "en" | "unknown"> {
  const prompt = `Определите язык следующего текста. Ответьте ТОЛЬКО одним из значений: "ru" для русского, "kz" для казахского, "en" для английского, "unknown" для неизвестного языка.
  
  Текст: "${text.substring(0, 500)}..."`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const result = response.choices[0].message.content.trim().toLowerCase();
    if (["ru", "kz", "en"].includes(result)) {
      return result as "ru" | "kz" | "en";
    }
    return "unknown";
  } catch (error) {
    console.error("Error detecting language:", error);
    return "unknown";
  }
}

/**
 * Translate text between languages
 */
export async function translateText(
  text: string, 
  from: "ru" | "kz" | "en", 
  to: "ru" | "kz" | "en"
): Promise<string> {
  if (from === to) return text;

  const languages = {
    ru: "русский",
    kz: "казахский",
    en: "английский"
  };

  const prompt = `Переведите следующий текст с ${languages[from]} на ${languages[to]}:
  
  ${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    return response.choices[0].message.content || "Не удалось выполнить перевод.";
  } catch (error) {
    console.error("Error translating text:", error);
    throw new Error(`Не удалось перевести текст: ${error.message}`);
  }
}
