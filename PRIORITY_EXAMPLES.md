# 🎯 Priority Detection Examples

## How to Express Task Priorities Naturally

The enhanced NLP Task Input now understands various ways to express task importance. Here are examples of how users can type naturally to indicate different priority levels.

## 🔴 High Priority Tasks

### Direct Keywords

- `"Call client urgent"`
- `"Submit report asap"`
- `"Fix bug critical"`
- `"Meeting preparation important"`
- `"Pay bills immediately"`
- `"Doctor appointment - must do"`
- `"Deadline today - crucial"`

### Contextual High Priority

- `"Email team before 5pm"` (time pressure)
- `"Call mom tonight"` (same day)
- `"Fix website now"` (immediate need)
- `"Finish presentation this morning"` (time-bound)
- `"Submit proposal by 3pm today"` (deadline pressure)

### Emotional/Urgent Language

- `"Need to call John!"` (exclamation marks)
- `"Handle customer complaint!!"`
- `"Emergency server maintenance"`
- `"Time sensitive: update passwords"`

## 🟡 Medium Priority Tasks (Default)

### Neutral Language

- `"Call supplier tomorrow"`
- `"Review documents this week"`
- `"Schedule team meeting"`
- `"Update project status"`
- `"Plan weekend trip"`

### No Priority Indicators

Tasks without priority keywords default to medium priority.

## 🟢 Low Priority Tasks

### Direct Low Priority Keywords

- `"Clean desk when possible"`
- `"Read industry news when I have time"`
- `"Organize files - no rush"`
- `"Update LinkedIn profile eventually"`
- `"Learn new skill if possible"`
- `"Sort old emails when convenient"`
- `"Research vacation spots - not urgent"`

### Relaxed/Flexible Language

- `"Maybe call old friend"`
- `"Could organize bookshelf"`
- `"Might read that book"`
- `"Perhaps update resume"`
- `"Clean garage if I have spare time"`

### Background/Filler Tasks

- `"Background task: archive old files"`
- `"Filler task: organize photos"`
- `"Free time activity: learn guitar"`
- `"Spare time: read programming book"`

### Contextual Low Priority

- `"Organize closet sometime next month"` (distant timing)
- `"Learn Spanish eventually"` (indefinite timing)
- `"Clean garage when free"` (conditional on availability)
- `"Research new laptop later"` (postponable)

## 🧠 Smart Context Detection

The system also infers priority from context:

### Time-Based Priority Inference

- **Today/Tonight** → High Priority

  - `"Water plants today"` → High
  - `"Call dentist tonight"` → High

- **Tomorrow/This Week** → Medium Priority

  - `"Email client tomorrow"` → Medium
  - `"Review budget this week"` → Medium

- **Next Week/Month** → Low Priority
  - `"Plan vacation next month"` → Low
  - `"Research courses sometime"` → Low

### Task Type Context

- **Communication** (call, email, meeting) → Often High
- **Maintenance** (clean, organize, sort) → Often Low
- **Learning** (read, study, research) → Often Low
- **Work Deliverables** → Context-dependent

### Language Patterns

- **Uncertain Language** (`maybe`, `might`, `could`) → Low Priority
- **Question Marks** (`"Should I call John?"`) → Low Priority
- **Definitive Language** (`must`, `need to`, `have to`) → High Priority

## 💡 Pro Tips for Users

### For High Priority:

- Use words like "urgent", "asap", "important", "critical"
- Add deadlines: "by 5pm", "before meeting"
- Use exclamation marks for emphasis
- Mention immediate timeframes: "today", "now", "tonight"

### For Low Priority:

- Use phrases like "when possible", "no rush", "if I have time"
- Add conditional language: "maybe", "might", "could"
- Mention flexible timing: "eventually", "sometime", "later"
- Use question marks for uncertain tasks

### For Better Recognition:

- Be specific about timing when possible
- Use natural language - the system understands conversational tone
- Don't worry about perfect grammar - focus on expressing your intent
- Combine priority words with time expressions for best results

## 🎯 Real-World Examples

### Work Scenarios

```
High: "Fix production bug urgent - affects customers"
Medium: "Update project documentation this week"
Low: "Research new development tools when I have time"
```

### Personal Tasks

```
High: "Pick up prescription today before pharmacy closes"
Medium: "Grocery shopping tomorrow evening"
Low: "Organize photo album when convenient"
```

### Mixed Context

```
High: "Prepare for important client meeting tomorrow morning"
Medium: "Review quarterly budget next Tuesday"
Low: "Maybe read that productivity book sometime"
```

The enhanced NLP system now provides much better priority detection, making task management more intuitive and natural!
