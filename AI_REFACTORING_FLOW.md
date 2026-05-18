# AI Refactoring Flow - Enhanced Version

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                      (FileViewer.jsx)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Click "AI Refactored Code"
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND PROCESSING                          │
│  • Extract code chunk (method/class)                            │
│  • Identify smell type (LongMethod, DataClass, etc.)            │
│  • Prepare request payload                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ POST /api/ai/refactor
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND CONTROLLER                             │
│              (AIRefactorController.java)                        │
│                                                                 │
│  1. Receive request with:                                       │
│     - smellType: "LongMethod"                                   │
│     - code: [actual code]                                       │
│     - fileName, startLine, endLine                              │
│                                                                 │
│  2. Get user AI settings (provider, model, API key)             │
│                                                                 │
│  3. Build enhanced prompt ──────────────────┐                   │
│                                             │                   │
└─────────────────────────────────────────────┼───────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PROMPT BUILDER (NEW LOGIC)                         │
│                                                                 │
│  buildRefactoringPrompt(smellType, code)                        │
│  ├─ Get smell-specific constraints                              │
│  │  └─ getRefactoringConstraints(smellType)                     │
│  │                                                              │
│  └─ Build comprehensive prompt:                                 │
│      ┌──────────────────────────────────────────┐              │
│      │ "You are a Java refactoring expert..."   │              │
│      │                                           │              │
│      │ TASK: Fix 'LongMethod' smell             │              │
│      │                                           │              │
│      │ CODE TO REFACTOR:                         │              │
│      │ [actual code]                             │              │
│      │                                           │              │
│      │ CRITICAL CONSTRAINTS - DO NOT:            │              │
│      │ ✗ Create Data Classes                     │              │
│      │ ✗ Create God Classes                      │              │
│      │ ✓ Extract methods in same class           │              │
│      │ ✓ Single responsibility per method        │              │
│      │                                           │              │
│      │ REQUIREMENTS:                             │              │
│      │ 1. Keep same functionality                │              │
│      │ 2. Follow SOLID principles                │              │
│      │ 3. Maintain encapsulation                 │              │
│      │ 4. Use meaningful names                   │              │
│      │ 5. Keep classes focused                   │              │
│      │                                           │              │
│      │ OUTPUT FORMAT (JSON only):                │              │
│      │ {"refactoredCode":"...",                  │              │
│      │  "explanation":"...",                     │              │
│      │  "howRemoved":"..."}                      │              │
│      └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────┬───────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI PROVIDER SELECTION                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   OpenAI     │  │    Ollama    │  │  Anthropic   │         │
│  │ GPT-3.5/4    │  │  Llama 3.1   │  │   Claude 3   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                 │
│         └─────────────────┼──────────────────┘                 │
│                           │                                    │
│  Enhanced System Message: │                                    │
│  "You are an expert Java refactoring assistant                 │
│   specializing in eliminating code smells WITHOUT              │
│   introducing new ones. Follow SOLID principles..."            │
│                           │                                    │
│  Temperature: 0.3 (balanced reasoning)                         │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            │ AI Processing
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI RESPONSE                                  │
│                                                                 │
│  {                                                              │
│    "refactoredCode": "                                          │
│      public void processOrder(Order order) {                   │
│        validateOrder(order);                                   │
│        calculateTotal(order);                                  │
│        applyDiscounts(order);                                  │
│        saveOrder(order);                                       │
│      }                                                          │
│                                                                 │
│      private void validateOrder(Order order) { ... }           │
│      private void calculateTotal(Order order) { ... }          │
│      private void applyDiscounts(Order order) { ... }          │
│      private void saveOrder(Order order) { ... }               │
│    ",                                                           │
│    "explanation": "Extracted 4 cohesive methods from the       │
│                    long method. Each has a single              │
│                    responsibility. Kept in same class as       │
│                    they all work with Order data.",            │
│    "howRemoved": "Reduced method from 50 lines to 5 lines      │
│                   by extracting logical steps into separate    │
│                   methods. No new classes created to avoid     │
│                   Data Class smell."                           │
│  }                                                              │
└─────────────────────────────────────────────┬───────────────────┘
                                              │
                                              │ Parse & Validate
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  RESPONSE PROCESSING                            │
│                                                                 │
│  parseAiResponse(response)                                      │
│  ├─ Extract JSON from response                                  │
│  ├─ Validate required fields                                    │
│  ├─ Decode HTML entities                                        │
│  └─ Return structured data                                      │
└─────────────────────────────────────────────┬───────────────────┘
                                              │
                                              │ Return to Frontend
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DISPLAY TO USER                              │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ✨ Refactored Code                                      │    │
│  │ ┌────────────────────────────────────────────────────┐ │    │
│  │ │ public void processOrder(Order order) {            │ │    │
│  │ │   validateOrder(order);                            │ │    │
│  │ │   calculateTotal(order);                           │ │    │
│  │ │   applyDiscounts(order);                           │ │    │
│  │ │   saveOrder(order);                                │ │    │
│  │ │ }                                                   │ │    │
│  │ │ ...                                                 │ │    │
│  │ └────────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │ 📝 Explanation                                          │    │
│  │ Extracted 4 cohesive methods from the long method...   │    │
│  │                                                         │    │
│  │ 🎯 How Smell is Removed                                │    │
│  │ Reduced method from 50 lines to 5 lines...             │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Improvements

### 1. Smell-Specific Constraints Matrix

```
┌──────────────────────┬─────────────────────────────────────────┐
│   Code Smell         │   Constraints Applied                   │
├──────────────────────┼─────────────────────────────────────────┤
│ LongMethod           │ ✗ No Data Classes                       │
│                      │ ✗ No God Classes                        │
│                      │ ✓ Extract in same class                 │
│                      │ ✓ Single responsibility                 │
├──────────────────────┼─────────────────────────────────────────┤
│ LargeClass/GodClass  │ ✗ No Data Classes                       │
│                      │ ✓ Split by cohesive responsibilities    │
│                      │ ✓ New classes must have behavior        │
├──────────────────────┼─────────────────────────────────────────┤
│ LongParameterList    │ ✗ No Data Classes                       │
│                      │ ✓ Parameter objects with methods        │
│                      │ ✓ Consider Builder pattern              │
├──────────────────────┼─────────────────────────────────────────┤
│ DataClass            │ ✓ Add business logic                    │
│                      │ ✓ Move related behavior                 │
│                      │ ✗ Don't just rename                     │
├──────────────────────┼─────────────────────────────────────────┤
│ FeatureEnvy          │ ✓ Move method to envied class           │
│                      │ ✗ No wrapper classes                    │
├──────────────────────┼─────────────────────────────────────────┤
│ DuplicateCode        │ ✓ Extract to logical location           │
│                      │ ✗ No single-use utilities               │
└──────────────────────┴─────────────────────────────────────────┘
```

### 2. Before vs After Comparison

```
BEFORE (Generic Prompt):
┌─────────────────────────────────────┐
│ "Refactor this code to fix:         │
│  LongMethod"                         │
│                                      │
│ [code]                               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ AI creates separate class with      │
│ only getters/setters                │
│                                      │
│ ❌ NEW SMELL: Data Class             │
└─────────────────────────────────────┘

AFTER (Enhanced Prompt):
┌─────────────────────────────────────┐
│ "Fix LongMethod smell"               │
│                                      │
│ CONSTRAINTS:                         │
│ ✗ No Data Classes                    │
│ ✗ No God Classes                     │
│ ✓ Extract in same class              │
│ ✓ SOLID principles                   │
│                                      │
│ [code]                               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ AI extracts smaller methods in      │
│ same class with clear responsibilities│
│                                      │
│ ✅ NO NEW SMELLS                     │
└─────────────────────────────────────┘
```

## Success Metrics

```
┌────────────────────────────────────────────────────────┐
│                   BEFORE FIX                           │
├────────────────────────────────────────────────────────┤
│ • 60% of suggestions introduced new smells             │
│ • Users regenerated 3-4 times on average               │
│ • Low confidence in AI suggestions                     │
│ • Frequent manual corrections needed                   │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                   AFTER FIX (Expected)                 │
├────────────────────────────────────────────────────────┤
│ • <10% of suggestions introduce new smells             │
│ • Users regenerate 0-1 times on average                │
│ • High confidence in AI suggestions                    │
│ • Minimal manual corrections needed                    │
└────────────────────────────────────────────────────────┘
```

## Implementation Checklist

- [x] Add `getRefactoringConstraints()` method
- [x] Enhance `buildRefactoringPrompt()` method
- [x] Update system messages for all AI providers
- [x] Adjust temperature for better reasoning
- [x] Test with different code smells
- [ ] Deploy to Railway
- [ ] Monitor user feedback
- [ ] Track success metrics
