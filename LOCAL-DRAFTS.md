# Local Draft Workflow

The Kit MCP Server now supports a **local-first workflow** where all email drafts are created, edited, and reviewed locally before being sent to Kit.

## Why Local Drafts?

✅ **Complete control** - Review and edit every email before it goes anywhere
✅ **Version control** - All drafts are saved as markdown files in your Content workspace
✅ **No accidental sends** - Emails only go to Kit when you explicitly approve
✅ **Easy editing** - Open drafts in your favorite editor, make changes, save
✅ **Content organization** - All emails stored alongside your other content

## Workflow

```
1. CREATE LOCAL → 2. REVIEW/EDIT → 3. APPROVE → 4. SEND TO KIT
   (instant)        (you control)    (your ok)    (with approval)
```

### Step 1: Create Local Draft

**You:** "Create a draft email about symptoms vs root causes"

**Claude:** Creates a .md file in your configured drafts folder (default: `./drafts/`)
- Filename: `2025-11-11_symptoms-vs-root-causes_1234567.md`
- Status: `draft`
- NO approval needed - just saves locally

### Step 2: Review & Edit

Open the file in your editor. The format looks like this:

```markdown
---
subject: "Symptoms vs Root Causes"
description: ""
created_at: "2025-11-11T18:30:00.000Z"
modified_at: "2025-11-11T18:30:00.000Z"
status: "draft"
draft_id: "draft_1731349800_abc123"
---

Hey

Most founders who reach out to me can't tell me what's actually wrong.

They see the symptoms: install drops, ranking fell from #3 to #8...

[rest of email content]
```

**Make any edits you want:**
- Change the subject
- Edit the content
- Add/remove sections
- Fix typos
- Adjust tone

Save the file.

### Step 3: Approve for Publishing

**You:** "Publish that draft to Kit"

**Claude:** Shows you the approval request:
```
⚠️ APPROVAL REQUIRED ⚠️

📧 CREATE EMAIL BROADCAST

Subject: Symptoms vs Root Causes
Content: Hey, Most founders who reach out...
📝 Status: DRAFT

🔑 Approval ID: approval_1
```

### Step 4: Send to Kit

**You:** "Yes, approve it"

**Claude:** ✅ Broadcast created in Kit!

The draft status in your local file automatically updates to `sent`.

## Available Commands

### Create a Local Draft
```
You: "Create a local draft about [topic]"
Claude: [Uses create_local_draft tool]
```

Creates a .md file in Content/eMail - **NO approval needed**

### List Your Drafts
```
You: "List my local drafts"
Claude: [Uses list_local_drafts tool]
```

Shows all .md files with draft metadata

### Read a Draft
```
You: "Show me draft_123456"
Claude: [Uses read_local_draft tool]
```

Displays the full content of a draft

### Publish to Kit
```
You: "Publish draft_123456 to Kit"
Claude: [Uses publish_local_draft_to_kit tool]
```

Requires approval before sending to Kit API

### Delete a Draft
```
You: "Delete draft_123456"
Claude: [Uses delete_local_draft tool]
```

Removes the local .md file

## Draft File Format

All drafts are stored as markdown files with YAML frontmatter:

```yaml
---
subject: "Email Subject"
description: "Internal notes"
created_at: "2025-11-11T18:30:00.000Z"
modified_at: "2025-11-11T18:30:00.000Z"
status: "draft"  # or "ready" or "sent"
send_at: "2025-11-15T09:00:00Z"  # optional
published: false  # optional
draft_id: "draft_1731349800_abc123"
---

Email content goes here in markdown format...
```

## Draft Statuses

- **`draft`** - Initial state, still being worked on
- **`ready`** - Ready to publish (you can manually change this)
- **`sent`** - Successfully published to Kit

## File Naming

Drafts are named automatically:
```
YYYY-MM-DD_subject-slug_timestamp.md
```

Example:
```
2025-11-11_symptoms-vs-root-causes_1731349800.md
```

## Tips

1. **Edit in any editor** - VSCode, Notion, iA Writer, whatever you prefer
2. **Keep iterations** - Save versions before making big changes
3. **Use git** - Your Content folder can track email history
4. **Search easily** - All emails are searchable text files
5. **Reuse content** - Copy sections between drafts easily

## Security

- ✅ **Local only** - Drafts never leave your machine until you approve
- ✅ **No accidental sends** - Publishing requires explicit approval
- ✅ **Full control** - You see and approve everything before it goes to Kit
- ✅ **Easy rollback** - Just edit the file or delete it

## Example Workflow

```
You: "Create a local draft email with subject 'Test' and content 'Hello World'"

Claude: ✅ LOCAL DRAFT CREATED

Draft ID: draft_1731349800_abc123
File: ./drafts/2025-11-11_test_1731349800.md

You can now:
1. Open the file to review/edit it
2. Use read_local_draft to view it
3. Use publish_local_draft_to_kit when ready

---

[You open the file, make edits, save]

---

You: "List my local drafts"

Claude: LOCAL DRAFTS:

━━━━━━━━━━━━━━━━━━━━━━━━
Draft ID: draft_1731349800_abc123
Subject: Test
Status: draft
Created: 11/11/2025, 6:30:00 PM
File: ./drafts/2025-11-11_test_1731349800.md

---

You: "Publish draft_1731349800_abc123 to Kit"

Claude: ⚠️ APPROVAL REQUIRED ⚠️

📧 CREATE EMAIL BROADCAST
Subject: Test
Content: Hello World (edited version)
📝 Status: DRAFT

Should I proceed?

---

You: "Yes, go ahead"

Claude: ✅ BROADCAST CREATED SUCCESSFULLY
Draft status updated to: sent
```

## Migration from Direct Creation

The old `create_broadcast` tool still works but is deprecated. We recommend using the local draft workflow instead:

**Old way:**
```
"Create a broadcast" → Approval → Sent to Kit
```

**New way:**
```
"Create a local draft" → Review/Edit locally → "Publish draft" → Approval → Sent to Kit
```

The new way gives you a chance to review and edit before anything goes to Kit.
