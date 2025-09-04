import { Customer, Medicine, Sale } from './types';

// GROQ AI Service for MediStock
class AIService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly difyApiKey: string;
  private readonly difyBaseUrl: string;

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
    this.difyApiKey = process.env.EXPO_PUBLIC_DIFY_API_KEY || '';
    this.difyBaseUrl = process.env.EXPO_PUBLIC_DIFY_BASE_URL || 'https://api.dify.ai/v1';
    
    console.log('🔧 AI Service Configuration:', {
      hasGroqKey: !!this.apiKey,
      hasDifyKey: !!this.difyApiKey,
      groqKeyLength: this.apiKey.length,
      difyKeyLength: this.difyApiKey.length,
      difyBaseUrl: this.difyBaseUrl
    });
    
    if (!this.apiKey) {
      console.warn('GROQ API key not found. AI features will be disabled.');
    }
    if (!this.difyApiKey) {
      console.warn('Dify API key not found. Advanced knowledge base features will be disabled.');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(messages: any[], model: string = 'llama-3.1-70b-versatile', retryCount: number = 3) {
    if (!this.apiKey) {
      throw new Error('GROQ API key not configured');
    }

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        // Add exponential backoff delay for retries
        if (attempt > 0) {
          const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
          console.log(`⏳ Retrying GROQ API request in ${delayMs}ms (attempt ${attempt + 1}/${retryCount})`);
          await this.delay(delayMs);
        }

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            max_tokens: 800, // Reduced to avoid rate limits
          }),
        });

        if (response.status === 429) {
          // Rate limit hit, try with exponential backoff
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt + 1) * 1000;
          
          if (attempt < retryCount - 1) {
            console.log(`🚫 Rate limit hit, waiting ${waitTime}ms before retry...`);
            await this.delay(waitTime);
            continue;
          } else {
            throw new Error(`GROQ API rate limit exceeded. Please try again in a few minutes.`);
          }
        }

        if (!response.ok) {
          throw new Error(`GROQ API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
      } catch (error) {
        if (attempt === retryCount - 1) {
          console.error('GROQ API request failed after all retries:', error);
          throw error;
        }
        console.log(`Attempt ${attempt + 1} failed, retrying...`);
      }
    }
  }

  // 🔍 Intelligent Medicine Recommendations based on symptoms
  async recommendMedicines(symptoms: string, patientAge?: number, patientGender?: string): Promise<{
    recommendations: {
      medicine: string;
      reason: string;
      dosage: string;
      category: string;
      confidence: number;
    }[];
    warnings: string[];
    advice: string;
  }> {
    const prompt = `
    As a pharmaceutical AI assistant for Bangladesh pharmacies, analyze these symptoms and recommend appropriate medicines:

    Symptoms: ${symptoms}
    Patient Age: ${patientAge || 'Not specified'}
    Patient Gender: ${patientGender || 'Not specified'}

    Provide recommendations in JSON format with:
    {
      "recommendations": [
        {
          "medicine": "Generic/Brand name",
          "reason": "Why this medicine helps",
          "dosage": "Suggested dosage",
          "category": "Medicine category",
          "confidence": 0-100
        }
      ],
      "warnings": ["Important warnings"],
      "advice": "General health advice"
    }

    Focus on common medicines available in Bangladesh pharmacies. Include both generic and brand names when possible.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a pharmaceutical AI assistant specializing in Bangladesh medicine recommendations.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      console.error('Medicine recommendation failed:', error);
      return {
        recommendations: [],
        warnings: ['AI service temporarily unavailable'],
        advice: 'Please consult with a healthcare professional'
      };
    }
  }

  // 💊 Medicine Interaction Checker
  async checkMedicineInteractions(medicines: string[]): Promise<{
    interactions: {
      medicines: string[];
      severity: 'low' | 'moderate' | 'high';
      description: string;
      recommendation: string;
    }[];
    safetyScore: number;
    overallAdvice: string;
  }> {
    const prompt = `
    Check for drug interactions between these medicines:
    ${medicines.join(', ')}

    Provide analysis in JSON format:
    {
      "interactions": [
        {
          "medicines": ["Med1", "Med2"],
          "severity": "low/moderate/high",
          "description": "Interaction description",
          "recommendation": "What to do"
        }
      ],
      "safetyScore": 0-100,
      "overallAdvice": "General safety advice"
    }

    Focus on common medicine interactions relevant to Bangladesh pharmacy context.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a pharmaceutical safety AI specializing in drug interactions.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      console.error('Interaction check failed:', error);
      return {
        interactions: [],
        safetyScore: 50,
        overallAdvice: 'Unable to check interactions. Please consult a pharmacist.'
      };
    }
  }

  // 📊 Predictive Stock Analysis
  async predictStockDemand(
    medicine: Medicine,
    salesHistory: Sale[],
    currentStock: number,
    seasonalFactors?: string
  ): Promise<{
    prediction: {
      nextWeekDemand: number;
      nextMonthDemand: number;
      reorderPoint: number;
      optimalOrderQuantity: number;
    };
    insights: string[];
    confidence: number;
  }> {
    const recentSales = salesHistory.slice(0, 30); // Last 30 sales
    const salesData = recentSales.map(sale => ({
      date: sale.created_at,
      quantity: sale.items.find(item => item.medicine_id === medicine.id)?.quantity || 0
    })).filter(item => item.quantity > 0);

    const prompt = `
    Analyze stock demand prediction for this medicine:
    
    Medicine: ${medicine.generic_name} (${medicine.brand_name})
    Current Stock: ${currentStock}
    Recent Sales Data: ${JSON.stringify(salesData)}
    Seasonal Factors: ${seasonalFactors || 'None specified'}
    
    Provide prediction in JSON format:
    {
      "prediction": {
        "nextWeekDemand": number,
        "nextMonthDemand": number,
        "reorderPoint": number,
        "optimalOrderQuantity": number
      },
      "insights": ["Key insights about demand patterns"],
      "confidence": 0-100
    }
    
    Consider Bangladesh market patterns and pharmacy business cycles.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are an inventory management AI specialist for pharmacies.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      console.error('Stock prediction failed:', error);
      return {
        prediction: {
          nextWeekDemand: Math.max(1, Math.floor(currentStock * 0.1)),
          nextMonthDemand: Math.max(5, Math.floor(currentStock * 0.3)),
          reorderPoint: Math.max(10, Math.floor(currentStock * 0.2)),
          optimalOrderQuantity: Math.max(20, Math.floor(currentStock * 0.5))
        },
        insights: ['Using basic calculation due to AI unavailability'],
        confidence: 30
      };
    }
  }

  // 🎤 Natural Language Medicine Search
  async searchMedicinesByNaturalLanguage(query: string, availableMedicines: Medicine[]): Promise<{
    matches: {
      medicine: Medicine;
      relevanceScore: number;
      matchReason: string;
    }[];
    interpretation: string;
    suggestions: string[];
  }> {
    const medicinesList = availableMedicines.map(med => 
      `${med.generic_name} (${med.brand_name}) - ${med.category} - ${med.strength}`
    ).join('\n');

    const prompt = `
    User query: "${query}"
    
    Available medicines:
    ${medicinesList}
    
    Find the most relevant medicines and provide response in JSON format:
    {
      "matches": [
        {
          "medicine_name": "Full medicine name",
          "relevanceScore": 0-100,
          "matchReason": "Why this medicine matches"
        }
      ],
      "interpretation": "What the user is looking for",
      "suggestions": ["Alternative search suggestions"]
    }
    
    Match based on symptoms, conditions, or medicine names. Understand natural language queries.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a medicine search AI that understands natural language queries.' },
        { role: 'user', content: prompt }
      ]);

      const result = JSON.parse(response);
      
      // Map medicine names back to Medicine objects
      const matches = result.matches.map((match: any) => {
        const medicine = availableMedicines.find(med => 
          med.generic_name.toLowerCase().includes(match.medicine_name.toLowerCase()) ||
          (med.brand_name && med.brand_name.toLowerCase().includes(match.medicine_name.toLowerCase()))
        );
        
        return medicine ? {
          medicine,
          relevanceScore: match.relevanceScore,
          matchReason: match.matchReason
        } : null;
      }).filter(Boolean);

      return {
        matches,
        interpretation: result.interpretation,
        suggestions: result.suggestions
      };
    } catch (error) {
      console.error('Natural language search failed:', error);
      return {
        matches: [],
        interpretation: 'AI search temporarily unavailable',
        suggestions: ['Try using specific medicine names', 'Use generic names', 'Search by category']
      };
    }
  }

  // 📈 Customer Behavior Analysis
  async analyzeCustomerBehavior(customer: Customer, purchaseHistory: Sale[]): Promise<{
    profile: {
      loyaltyScore: number;
      preferredCategories: string[];
      averageOrderValue: number;
      visitFrequency: string;
    };
    insights: string[];
    recommendations: {
      forPharmacy: string[];
      forCustomer: string[];
    };
  }> {
    const customerData = {
      totalPurchases: purchaseHistory.length,
      totalSpent: purchaseHistory.reduce((sum, sale) => sum + sale.total_amount, 0),
      averageOrder: purchaseHistory.length > 0 ? 
        purchaseHistory.reduce((sum, sale) => sum + sale.total_amount, 0) / purchaseHistory.length : 0,
      medicineCategories: purchaseHistory.flatMap(sale => 
        sale.items.map(item => item.medicine_name)
      )
    };

    const prompt = `
    Analyze customer behavior for:
    Customer: ${customer.name}
    Purchase Data: ${JSON.stringify(customerData)}
    
    Provide analysis in JSON format:
    {
      "profile": {
        "loyaltyScore": 0-100,
        "preferredCategories": ["category1", "category2"],
        "averageOrderValue": number,
        "visitFrequency": "daily/weekly/monthly"
      },
      "insights": ["Key behavioral insights"],
      "recommendations": {
        "forPharmacy": ["Business recommendations"],
        "forCustomer": ["Customer service suggestions"]
      }
    }
    
    Focus on actionable insights for pharmacy business growth.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a customer analytics AI for pharmacy business intelligence.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      console.error('Customer analysis failed:', error);
      return {
        profile: {
          loyaltyScore: 50,
          preferredCategories: ['General'],
          averageOrderValue: customerData.averageOrder,
          visitFrequency: 'unknown'
        },
        insights: ['Analysis temporarily unavailable'],
        recommendations: {
          forPharmacy: ['Maintain good customer service'],
          forCustomer: ['Offer loyalty programs']
        }
      };
    }
  }

  // 💰 Pricing Optimization
  async optimizePricing(
    medicine: Medicine,
    currentPrice: number,
    competitorPrices: number[],
    salesData: Sale[]
  ): Promise<{
    suggestedPrice: number;
    priceRange: { min: number; max: number };
    reasoning: string;
    expectedImpact: {
      salesVolume: string;
      profit: string;
      competitiveness: string;
    };
  }> {
    const avgCompetitorPrice = competitorPrices.length > 0 ? 
      competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length : currentPrice;

    const prompt = `
    Optimize pricing for:
    Medicine: ${medicine.generic_name}
    Current Price: ৳${currentPrice}
    Average Competitor Price: ৳${avgCompetitorPrice}
    Recent Sales: ${salesData.length} transactions
    
    Provide pricing recommendation in JSON format:
    {
      "suggestedPrice": number,
      "priceRange": {"min": number, "max": number},
      "reasoning": "Why this price is optimal",
      "expectedImpact": {
        "salesVolume": "increase/decrease/stable",
        "profit": "increase/decrease/stable", 
        "competitiveness": "high/medium/low"
      }
    }
    
    Consider Bangladesh market conditions and pharmacy profit margins.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a pricing optimization AI for pharmaceutical retail.' },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      console.error('Pricing optimization failed:', error);
      return {
        suggestedPrice: currentPrice,
        priceRange: { min: currentPrice * 0.9, max: currentPrice * 1.1 },
        reasoning: 'Maintain current pricing due to AI unavailability',
        expectedImpact: {
          salesVolume: 'stable',
          profit: 'stable',
          competitiveness: 'medium'
        }
      };
    }
  }

  // Generate proper UUID for Dify conversation ID
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Clean AI response by removing thinking tags and internal reasoning
  private cleanAIResponse(response: string): string {
    // Remove <think>...</think> blocks completely
    let cleaned = response.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    // Remove any residual thinking patterns
    cleaned = cleaned.replace(/^\s*(?:Let me think|I think|I need to|First|Next|Then|So)\s*[.:]\s*/gmi, '');
    
    // Clean up multiple newlines and trim
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    return cleaned || response; // Return original if cleaning results in empty string
  }

  // 🧠 Dify Knowledge Base Integration
  async queryDifyKnowledgeBase(
    query: string,
    conversationId?: string,
    userId: string = 'user'
  ): Promise<{
    answer: string;
    conversationId: string;
    sources?: string[];
    confidence: number;
  }> {
    if (!this.difyApiKey) {
      throw new Error('Dify API key not configured');
    }

    try {
      console.log('🔍 Dify API Request:', {
        url: `${this.difyBaseUrl}/chat-messages`,
        query: query.substring(0, 100) + '...',
        conversationId
      });

      const response = await fetch(`${this.difyBaseUrl}/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.difyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {},
          query,
          response_mode: 'blocking',
          conversation_id: conversationId || this.generateUUID(),
          user: userId,
          files: []
        }),
      });

      console.log('📡 Dify API Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Dify API Error Details:', errorText);
        throw new Error(`Dify API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Dify Response Success:', {
        hasAnswer: !!data.answer,
        answerLength: data.answer?.length || 0,
        conversationId: data.conversation_id
      });

      return {
        answer: data.answer || '',
        conversationId: data.conversation_id || '',
        sources: data.metadata?.sources || [],
        confidence: data.metadata?.confidence || 80
      };
    } catch (error) {
      console.error('❌ Dify knowledge base query failed:', error);
      throw error;
    }
  }

  // Detect if message is in Bengali
  private detectBengaliLanguage(text: string): boolean {
    const bengaliPattern = /[\u0980-\u09FF]/;
    return bengaliPattern.test(text);
  }

  // 🤖 Enhanced Pharmacy Chatbot with Dify Integration
  async enhancedPharmacyChat(
    userMessage: string,
    conversationId?: string,
    pharmacyContext?: any
  ): Promise<{
    response: string;
    conversationId: string;
    usesDifyKnowledge: boolean;
    sources?: string[];
    language: 'en' | 'bn';
  }> {
    // Detect language of user message
    const isBengali = this.detectBengaliLanguage(userMessage);
    const responseLanguage = isBengali ? 'bn' : 'en';

    // First try Dify knowledge base for pharmacy-specific questions
    const isPharmacyQuestion = this.isPharmacySpecificQuestion(userMessage);
    
    if (isPharmacyQuestion && this.difyApiKey) {
      try {
        const difyResult = await this.queryDifyKnowledgeBase(
          userMessage, 
          conversationId,
          pharmacyContext?.userId || 'user'
        );
        
        // If Dify provides a good answer (high confidence), use it
        if (difyResult.confidence > 60 && difyResult.answer.length > 20) {
          return {
            response: this.formatDifyResponse(difyResult.answer, difyResult.sources, responseLanguage),
            conversationId: difyResult.conversationId,
            usesDifyKnowledge: true,
            sources: difyResult.sources,
            language: responseLanguage
          };
        }
      } catch (error) {
        console.warn('Dify query failed, falling back to Groq:', error);
      }
    }

    // Fallback to Groq Llama 3 70B for general business questions
    try {
      const contextualPrompt = this.buildPharmacyContextPrompt(userMessage, pharmacyContext, responseLanguage);
      const systemMessage = responseLanguage === 'bn' 
        ? 'You are MediBot, একজন বিশেষজ্ঞ AI সহায়ক যিনি বাংলাদেশের ফার্মেসি পরিচালনায় বিশেষজ্ঞ। ব্যবহারিক, কার্যকর পরামর্শ প্রদান করুন এবং বন্ধুত্বপূর্ণ ও পেশাদার থাকুন। প্রাসঙ্গিক ইমোজি ব্যবহার করে উত্তর আকর্ষণীয় করুন। সবসময় বাংলায় উত্তর দিন।'
        : 'You are MediBot, an expert AI assistant specializing in Bangladesh pharmacy operations. Provide practical, actionable advice while being friendly and professional. Use relevant emojis to make responses engaging. Always respond in English.';
        
      const groqResponse = await this.makeRequest([
        { 
          role: 'system', 
          content: systemMessage
        },
        { role: 'user', content: contextualPrompt }
      ], 'llama-3.1-70b-versatile'); // Using more stable model

      // Clean the response to remove any thinking tags
      const cleanedResponse = this.cleanAIResponse(groqResponse);

      return {
        response: cleanedResponse,
        conversationId: conversationId || this.generateUUID(),
        usesDifyKnowledge: false,
        language: responseLanguage
      };
    } catch (error) {
      console.error('Enhanced pharmacy chat failed:', error);
      
      // Check if it's a rate limiting error
      const isRateLimitError = error instanceof Error && error.message && error.message.includes('rate limit');
      
      return {
        response: this.getSmartFallbackResponse(userMessage, pharmacyContext, responseLanguage, isRateLimitError),
        conversationId: conversationId || this.generateUUID(),
        usesDifyKnowledge: false,
        language: responseLanguage
      };
    }
  }

  private isPharmacySpecificQuestion(message: string): boolean {
    const pharmacyKeywords = [
      'medicine', 'drug', 'prescription', 'dosage', 'interaction', 'side effect',
      'paracetamol', 'napa', 'ace', 'antibiotic', 'vitamin', 'tablet', 'syrup',
      'fever', 'headache', 'pain', 'cough', 'cold', 'diabetes', 'blood pressure',
      'bangladesh', 'pharmacy', 'generic', 'brand', 'manufacturer'
    ];
    
    const lowerMessage = message.toLowerCase();
    return pharmacyKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private formatDifyResponse(answer: string, sources?: string[], language: 'en' | 'bn' = 'en'): string {
    const labels = language === 'bn' ? {
      knowledgeBase: '🧠 **জ্ঞানভাণ্ডার থেকে উত্তর:**',
      sources: '📚 **উৎসগুলি:**',
      note: '💡 *এই উত্তরটি আমাদের বিশেষায়িত ফার্মেসি জ্ঞানভাণ্ডার থেকে এসেছে।*'
    } : {
      knowledgeBase: '🧠 **Knowledge Base Answer:**',
      sources: '📚 **Sources:**',
      note: '💡 *This answer comes from our specialized pharmacy knowledge base.*'
    };

    let formattedResponse = `${labels.knowledgeBase}\n\n${answer}`;
    
    if (sources && sources.length > 0) {
      formattedResponse += `\n\n${labels.sources}\n${sources.map(source => `• ${source}`).join('\n')}`;
    }
    
    formattedResponse += `\n\n${labels.note}`;
    
    return formattedResponse;
  }

  private buildPharmacyContextPrompt(userMessage: string, context?: any, language: 'en' | 'bn' = 'en'): string {
    const contextInfo = context ? (language === 'bn' ? `
    ফার্মেসি তথ্য:
    - নাম: ${context.pharmacyName || 'আপনার ফার্মেসি'}
    - আজকের আয়: ৳${context.dailyRevenue || 0}
    - মোট বাকি: ৳${context.totalDue || 0}
    - কম স্টক পণ্য: ${context.lowStockCount || 0}
    - মোট গ্রাহক: ${context.totalCustomers || 0}
    - আজকের তারিখ: ${new Date().toLocaleDateString('bn-BD')}
    ` : `
    Pharmacy Context:
    - Name: ${context.pharmacyName || 'Your Pharmacy'}
    - Daily Revenue: ৳${context.dailyRevenue || 0}
    - Total Due: ৳${context.totalDue || 0}
    - Low Stock Items: ${context.lowStockCount || 0}
    - Total Customers: ${context.totalCustomers || 0}
    - Current Date: ${new Date().toDateString()}
    `) : '';

    if (language === 'bn') {
      return `
      ${contextInfo}

      ব্যবহারকারীর প্রশ্ন: "${userMessage}"

      MediBot হিসেবে, এই বাংলাদেশি ফার্মেসির জন্য সহায়ক পরামর্শ প্রদান করুন। মনোযোগ দিন:
      - ব্যবহারিক ব্যবসায়িক সমাধান
      - গ্রাহক সেবার উৎকর্ষতা
      - ইনভেন্টরি অপ্টিমাইজেশন
      - নিয়ন্ত্রক সম্মতি
      - বৃদ্ধির কৌশল
      - ওষুধের নিরাপত্তা (চিকিৎসা পরামর্শের জন্য সর্বদা স্বাস্থ্যসেবা পেশাদারদের পরামর্শ নিতে বলুন)

      উত্তর সংক্ষিপ্ত কিন্তু তথ্যবহুল রাখুন (বিস্তারিত ব্যাখ্যার অনুরোধ না থাকলে ২০০ শব্দের মধ্যে)।
      উপযুক্ত ইমোজি ব্যবহার করুন এবং পেশাদার কিন্তু বন্ধুত্বপূর্ণ স্বর বজায় রাখুন।
      `;
    }

    return `
    ${contextInfo}

    User Question: "${userMessage}"

    As MediBot, provide helpful advice for this Bangladesh pharmacy. Focus on:
    - Practical business solutions
    - Customer service excellence  
    - Inventory optimization
    - Regulatory compliance
    - Growth strategies
    - Medicine safety (always recommend consulting healthcare professionals for medical advice)

    Keep responses concise but informative (under 200 words unless detailed explanation requested).
    Use appropriate emojis and maintain a professional yet friendly tone.
    `;
  }

  private getSmartFallbackResponse(userMessage: string, context?: any, language: 'en' | 'bn' = 'en', isRateLimitError: boolean = false): string {
    const message = userMessage.toLowerCase();
    
    // Handle rate limiting errors specifically
    if (isRateLimitError) {
      if (language === 'bn') {
        return `⚠️ **AI সার্ভিস সাময়িক ব্যস্ত**\n\n🚫 আমাদের AI সেবা এখন অনেক বেশি ব্যবহার হচ্ছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।\n\n**এখনও সাহায্য করতে পারি:**\n🏥 মৌলিক ওষুধ নিরাপত্তা গাইড\n📦 ইনভেন্টরি ব্যবস্থাপনা টিপস\n💰 ব্যবসায়িক অপ্টিমাইজেশন পরামর্শ\n📊 ফার্মেসি সর্বোত্তম অনুশীলন\n\n**চিকিৎসা প্রশ্নের জন্য:** স্বাস্থ্যসেবা পেশাদার বা নির্ভরযোগ্য চিকিৎসা রেফারেন্স পরামর্শ নিন।\n\n**আবার চেষ্টা করুন:** ২-৩ মিনিট পর আবার চেষ্টা করুন! 🔄`;
      }
      return `⚠️ **AI Service Temporarily Busy**\n\n🚫 Our AI service is experiencing high usage right now. Please wait a moment before trying again.\n\n**Still Available:**\n🏥 Basic medicine safety guidelines\n📦 Inventory management tips\n💰 Business optimization advice\n📊 Pharmacy best practices\n\n**For Medical Questions:** Please consult healthcare professionals or reliable medical references.\n\n**Try Again:** Wait 2-3 minutes and try again! The service should be available shortly. 🔄`;
    }
    
    // Handle greetings
    if (message.includes('hello') || message.includes('hi') || message.includes('start')) {
      return `👋 Hello! I'm MediBot, your AI pharmacy assistant powered by DeepSeek R1 Distill Llama 70B and specialized knowledge base.\n\nI can help you with:\n🏥 Medicine information & interactions\n📊 Business analytics & insights\n📦 Inventory management\n💰 Sales optimization\n👥 Customer service\n📈 Growth strategies\n\nWhat would you like to discuss today?`;
    }
    
    // Handle inventory questions
    if (message.includes('stock') || message.includes('inventory')) {
      return `📦 **Inventory Management Tips:**\n\n• Monitor low stock alerts (${context?.lowStockCount || 'several'} items need attention)\n• Set up automatic reorder points\n• Track fast vs slow-moving medicines\n• Regular stock audits prevent losses\n• Consider seasonal demand patterns\n• Use ABC analysis for prioritization\n\nNeed help with specific inventory challenges? Just ask! 💪`;
    }
    
    // Handle medical questions with basic information
    if (message.includes('paracetamol') || message.includes('napa')) {
      return `💊 **Paracetamol (Napa) - Basic Information**\n\n**Uses:**\n• Fever reduction\n• Mild to moderate pain relief\n• Headache, body ache\n\n**Safe Dosage:**\n• Adults: 500mg-1000mg every 4-6 hours\n• Maximum: 4000mg per day\n• Children: 10-15mg/kg per dose\n\n**Precautions:**\n⚠️ Avoid with liver disease\n⚠️ Don't exceed daily maximum\n⚠️ Check other medicines for paracetamol content\n\n**⚠️ Important:** This is basic information only. Always consult healthcare professionals for proper medical advice. AI services are temporarily unavailable for detailed analysis.`;
    }
    
    if (message.includes('medicine') || message.includes('drug') || message.includes('dosage') || message.includes('side effect')) {
      return `🏥 **Medical Information Request**\n\n⚠️ **AI services temporarily unavailable**\n\nFor medical questions, please:\n• Consult qualified healthcare professionals\n• Refer to official medicine guides\n• Contact your local pharmacist\n• Use reliable medical references\n\n**Basic Safety Reminders:**\n• Always check medicine expiry dates\n• Follow prescribed dosages exactly\n• Be aware of drug interactions\n• Report adverse reactions immediately\n\n**For business questions, I can still help with inventory, sales optimization, and pharmacy management! 💪**`;
    }
    
    // Default response for connection issues
    return `⚠️ **AI Services Temporarily Unavailable**\n\nI'm experiencing connection issues, but I'm still here to help!\n\n**Available Options:**\n🏥 Basic medicine safety guidelines\n📦 Inventory management tips\n💰 Business optimization advice\n📊 Pharmacy best practices\n\n**For Medical Questions:**\nPlease consult healthcare professionals or reliable medical references.\n\n**Try Again:** The connection should be restored shortly. Feel free to ask again! 🔄`;
  }
}

export const aiService = new AIService();