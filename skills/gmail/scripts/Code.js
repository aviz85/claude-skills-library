/**
 * Gmail API - Google Apps Script
 * Deploy as Web App: Execute as "Me", Access "Anyone"
 *
 * Actions: send, inbox, draft, drafts, editDraft, deleteDraft, markRead
 */

// Set your secret token here before deploying
const SECRET_TOKEN = PropertiesService.getScriptProperties().getProperty('SECRET_TOKEN') || 'aviz-gmail-2026';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter;

  // Auth check
  if (params.token !== SECRET_TOKEN) {
    return jsonResponse({ success: false, error: 'Invalid token' }, 401);
  }

  const action = params.action || 'send';

  try {
    switch (action) {
      case 'send':
        return sendEmail(params);
      case 'inbox':
        return getInbox(params);
      case 'draft':
        return createDraft(params);
      case 'drafts':
        return listDrafts(params);
      case 'editDraft':
        return editDraft(params);
      case 'deleteDraft':
        return deleteDraft(params);
      case 'markRead':
        return markAsRead(params);
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Send email
 */
function sendEmail(params) {
  const to = params.to;
  const subject = params.subject || '(No Subject)';
  const body = params.body || '';
  const html = params.html;
  const cc = params.cc;
  const bcc = params.bcc;
  const replyTo = params.replyTo; // message ID to reply to
  const name = params.name || Session.getActiveUser().getEmail().split('@')[0];

  if (!to && !replyTo) {
    return jsonResponse({ success: false, error: 'Missing "to" parameter' });
  }

  const options = { name: name };
  if (cc) options.cc = cc;
  if (bcc) options.bcc = bcc;
  if (html) options.htmlBody = html;

  if (replyTo) {
    const message = GmailApp.getMessageById(replyTo);
    if (!message) {
      return jsonResponse({ success: false, error: 'Message not found: ' + replyTo });
    }
    message.reply(body, options);
  } else {
    GmailApp.sendEmail(to, subject, body, options);
  }

  return jsonResponse({
    success: true,
    email: { to: to || '(reply)', subject, cc: cc || null, bcc: bcc || null }
  });
}

/**
 * Get inbox emails
 */
function getInbox(params) {
  const maxResults = parseInt(params.maxResults) || 20;
  const hours = parseInt(params.hours) || 24;
  const query = params.query || '';

  // Build search query.
  // A custom query is honored verbatim — no implicit filters bolted on, so
  // callers can reliably search sent mail, archived threads, etc. The default
  // unread+time window only applies when no query is supplied.
  let searchQuery;
  if (query) {
    searchQuery = query;
  } else {
    searchQuery = 'is:unread';
    if (hours > 0) {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      const dateStr = Utilities.formatDate(cutoffDate, 'GMT', 'yyyy/MM/dd');
      searchQuery += ' after:' + dateStr;
    }
  }

  const threads = GmailApp.search(searchQuery, 0, maxResults);
  const emails = [];

  for (const thread of threads) {
    // Newest message first within each thread, so a small maxResults surfaces
    // the most recent mail rather than the oldest (which silently hid replies).
    const messages = thread.getMessages().reverse();
    for (const msg of messages) {
      // Skip if not matching unread filter (unless custom query)
      if (!query && !msg.isUnread()) continue;

      emails.push({
        id: msg.getId(),
        threadId: thread.getId(),
        from: msg.getFrom(),
        to: msg.getTo(),
        subject: msg.getSubject(),
        date: msg.getDate().toISOString(),
        snippet: msg.getPlainBody().substring(0, 200),
        body: msg.getPlainBody(),
        isUnread: msg.isUnread(),
        labels: thread.getLabels().map(l => l.getName())
      });

      if (emails.length >= maxResults) break;
    }
    if (emails.length >= maxResults) break;
  }

  return jsonResponse({
    success: true,
    count: emails.length,
    query: searchQuery,
    emails: emails
  });
}

/**
 * Create draft email
 */
function createDraft(params) {
  const to = params.to;
  const subject = params.subject || '(No Subject)';
  const body = params.body || '';
  const html = params.html;
  const replyTo = params.replyTo;

  if (!to) {
    return jsonResponse({ success: false, error: 'Missing "to" parameter' });
  }

  let draft;

  if (replyTo) {
    // Create reply draft
    const message = GmailApp.getMessageById(replyTo);
    if (!message) {
      return jsonResponse({ success: false, error: 'Message not found: ' + replyTo });
    }

    const thread = message.getThread();
    draft = thread.createDraftReply(body, {
      htmlBody: html,
      subject: subject
    });
  } else {
    // Create new draft
    draft = GmailApp.createDraft(to, subject, body, {
      htmlBody: html
    });
  }

  return jsonResponse({
    success: true,
    draft: {
      id: draft.getId(),
      to: to,
      subject: subject
    }
  });
}

/**
 * List existing drafts (so a caller can find a draftId to edit/send).
 */
function listDrafts(params) {
  const maxResults = parseInt(params.maxResults) || 20;
  const drafts = GmailApp.getDrafts();
  const out = [];

  for (const d of drafts) {
    const m = d.getMessage();
    out.push({
      id: d.getId(),
      to: m.getTo(),
      subject: m.getSubject(),
      date: m.getDate().toISOString(),
      snippet: m.getPlainBody().substring(0, 200)
    });
    if (out.length >= maxResults) break;
  }

  return jsonResponse({ success: true, count: out.length, drafts: out });
}

/**
 * Edit (update) an existing draft in place.
 *
 * GmailDraft.update() REPLACES the whole draft, so any field not supplied is
 * re-filled from the draft's current message — callers can change just the
 * body (or just the subject) without clobbering the rest. Pass html to set an
 * HTML body. The draftId stays the same; the same draft is edited, not cloned.
 */
function editDraft(params) {
  const draftId = params.draftId;
  if (!draftId) {
    return jsonResponse({ success: false, error: 'Missing "draftId" parameter' });
  }

  let draft;
  try {
    draft = GmailApp.getDraft(draftId);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Draft not found: ' + draftId });
  }
  if (!draft) {
    return jsonResponse({ success: false, error: 'Draft not found: ' + draftId });
  }

  const msg = draft.getMessage();
  const to = (params.to != null) ? params.to : msg.getTo();
  const subject = (params.subject != null) ? params.subject : msg.getSubject();
  const body = (params.body != null) ? params.body : msg.getPlainBody();

  const options = {};
  if (params.html) options.htmlBody = params.html;
  if (params.cc) options.cc = params.cc;
  if (params.bcc) options.bcc = params.bcc;

  draft.update(to, subject, body, options);

  return jsonResponse({
    success: true,
    draft: { id: draft.getId(), to: to, subject: subject }
  });
}

/**
 * Delete a draft permanently.
 *
 * GmailApp has no native draft-delete, so this uses the advanced Gmail service
 * (Gmail.Users.Drafts.remove). The draftId is the SAME id returned by
 * createDraft / listDrafts / GmailDraft.getId() — same namespace, pass it
 * straight through. Requires the Gmail advanced service declared in
 * appsscript.json (dependencies.enabledAdvancedServices). The full
 * `https://mail.google.com/` scope GmailApp already uses covers drafts.remove.
 */
function deleteDraft(params) {
  const draftId = params.draftId;
  if (!draftId) {
    return jsonResponse({ success: false, error: 'Missing "draftId" parameter' });
  }

  try {
    Gmail.Users.Drafts.remove('me', draftId);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Could not delete draft ' + draftId + ': ' + err.toString() });
  }

  return jsonResponse({ success: true, draftId: draftId, deleted: true });
}

/**
 * Mark email as read
 */
function markAsRead(params) {
  const messageId = params.messageId;

  if (!messageId) {
    return jsonResponse({ success: false, error: 'Missing "messageId" parameter' });
  }

  const message = GmailApp.getMessageById(messageId);
  if (!message) {
    return jsonResponse({ success: false, error: 'Message not found: ' + messageId });
  }

  message.markRead();

  return jsonResponse({
    success: true,
    messageId: messageId,
    marked: 'read'
  });
}

/**
 * JSON response helper
 */
function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * SETUP FUNCTION - Run this first to set your secret token
 * Click Run > setupToken
 */
function setupToken() {
  const token = 'YOUR_SECRET_TOKEN_HERE'; // Change this!
  PropertiesService.getScriptProperties().setProperty('SECRET_TOKEN', token);
  Logger.log('Token set successfully!');
  return 'Token configured';
}

/**
 * TEST FUNCTION - Run this to authorize Gmail access
 * Click Run > testAuth to grant permissions
 */
function testAuth() {
  // This triggers Gmail authorization
  const threads = GmailApp.search('is:unread', 0, 1);
  Logger.log('Found ' + threads.length + ' threads');
  Logger.log('Authorization successful!');
  return 'OK';
}
