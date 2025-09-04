# 🧠 Dify AI Knowledge Base Setup Guide

## Overview
Your MediStock app now includes an advanced AI chatbot powered by:
- **Groq Llama 3 70B-8192**: High-performance language model for reasoning
- **Dify**: Knowledge base platform for pharmacy-specific information

## 🚀 Features Added

### 1. **AI Sidebar Chatbot**
- Slides in from the left side of the screen
- Persistent conversation history
- Smart context awareness of your pharmacy data

### 2. **Floating AI Button**
- Always visible on all screens
- Shows notifications when AI assistance is needed
- Quick access to AI help

### 3. **Dual AI System**
- **Dify Knowledge Base**: Specialized pharmacy/medicine questions
- **Groq Llama 3 70B**: General business advice and analytics

## 📋 Setup Instructions

### Step 1: Create Dify Account
1. Go to [dify.ai](https://dify.ai)
2. Create a free account
3. Verify your email

### Step 2: Create Knowledge Base
1. In Dify dashboard, click **"Create App"**
2. Choose **"Chatbot"** template
3. Name it: **"MediStock Pharmacy Assistant"**

### Step 3: Add Pharmacy Knowledge
Upload these types of documents to your Dify knowledge base:

#### 🏥 **Medicine Information**
```
- Bangladesh pharmacy regulations
- Common medicine interactions
- Dosage guidelines
- Medicine storage requirements
- Prescription validation rules
```

#### 📊 **Business Knowledge**
```
- Pharmacy management best practices
- Inventory optimization strategies
- Customer service protocols
- Sales techniques
- Regulatory compliance
```

#### 🇧🇩 **Bangladesh-Specific Info**
```
- Local medicine brands and generics
- DGDA regulations
- Import/export rules
- Tax and VAT information
- Common health conditions
```

### Step 4: Get API Keys
1. In your Dify app, go to **"API Access"**
2. Copy the **API Key**
3. Copy the **Base URL** (usually `https://api.dify.ai/v1`)

### Step 5: Update Your App
1. Open your `.env` file
2. Replace the placeholder values:

```env
# Replace with your actual Dify credentials
DIFY_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxxx
DIFY_BASE_URL=https://api.dify.ai/v1
```

### Step 6: Test the Integration
1. Restart your app: `npm start`
2. Tap the 🤖 floating button
3. Try these test questions:

```
✅ Medicine Questions (Dify):
- "What are the side effects of Paracetamol?"
- "Can I take Napa with blood pressure medication?"
- "What's the difference between Ace and Napa?"

✅ Business Questions (Groq):
- "How can I increase my pharmacy sales?"
- "Show me today's business metrics"
- "What should I do about low stock items?"
```

## 🎯 Smart AI Routing

The system automatically decides which AI to use:

### **Dify Knowledge Base** (for pharmacy questions)
- Medicine names and interactions
- Dosages and side effects
- Health conditions and symptoms
- Regulatory compliance
- Bangladesh pharmacy specifics

### **Groq Llama 3 70B** (for business questions)
- Sales analysis and optimization
- Customer service advice
- Inventory management
- Growth strategies
- Operational efficiency

## 🔧 Advanced Configuration

### Custom Prompts
Edit `ai-service.ts` to customize AI behavior:

```typescript
// For pharmacy-specific responses
private buildPharmacyContextPrompt(userMessage: string, context?: any): string {
  // Customize this to match your pharmacy's needs
}
```

### Knowledge Base Categories
Organize your Dify knowledge base with these categories:

1. **Medicines & Drugs**
2. **Health Conditions**  
3. **Pharmacy Operations**
4. **Regulatory Compliance**
5. **Customer Service**
6. **Business Management**

### Notification Triggers
The AI button shows notifications when:
- More than 5 items are low in stock
- Total due amount exceeds ৳10,000  
- Daily revenue is below ৳1,000

Edit these thresholds in `(tabs)/_layout.tsx`:

```typescript
const shouldNotify = 
  lowStockItems.length > 5 || // Adjust this number
  businessMetrics.totalDue > 10000 || // Adjust this amount
  (sales.length > 0 && businessMetrics.dailyRevenue < 1000); // Adjust this amount
```

## 📱 Usage Tips

### **For Pharmacy Staff:**
- Ask about medicine interactions before sales
- Get dosage recommendations
- Check for contraindications
- Learn about new regulations

### **For Business Owners:**
- Get daily business insights
- Optimize inventory management
- Improve customer service
- Analyze sales patterns

### **Smart Questions to Try:**
```
💊 "Is it safe to give Paracetamol with diabetes medication?"
📊 "How can I improve my daily sales performance?"
📦 "Which medicines should I order more of this month?"
👥 "How do I handle customer complaints about medicine prices?"
🏥 "What are the new DGDA regulations I should know about?"
```

## 🛠️ Troubleshooting

### Common Issues:

1. **"Dify API key not configured"**
   - Check your `.env` file has the correct `DIFY_API_KEY`
   - Restart the app after updating `.env`

2. **"AI features will be disabled"**
   - Verify both `GROQ_API_KEY` and `DIFY_API_KEY` are set
   - Check your internet connection

3. **Slow responses**
   - Dify responses depend on your knowledge base size
   - Consider using smaller, more focused documents

4. **No pharmacy-specific answers**
   - Upload more medicine and pharmacy documents to Dify
   - Check your knowledge base is properly trained

## 🔄 Updates & Maintenance

### Monthly Tasks:
- Update medicine information in Dify
- Review and improve AI responses
- Add new pharmacy regulations
- Update business knowledge

### Performance Monitoring:
- Check AI response accuracy
- Monitor user satisfaction
- Track most common questions
- Update knowledge base accordingly

## 💡 Pro Tips

1. **Upload diverse content** to Dify for better responses
2. **Use specific questions** rather than vague ones
3. **Provide feedback** to improve AI responses over time
4. **Organize knowledge** by categories in Dify
5. **Regular updates** keep information current

---

## 🎉 You're Ready!

Your pharmacy now has an intelligent AI assistant that combines:
- **Advanced reasoning** (Groq Llama 3 70B)
- **Specialized knowledge** (Dify)
- **Real-time business data** (your pharmacy metrics)

The AI will help you make better decisions, serve customers better, and grow your pharmacy business! 🚀

For support, check the [Dify documentation](https://docs.dify.ai) or [Groq documentation](https://console.groq.com/docs).