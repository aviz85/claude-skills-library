/**
 * Calendar API — read/write Google Calendar via an Apps Script web app.
 *
 * Reads EVERY calendar attached/subscribed under the deploying account
 * (CalendarApp.getAllCalendars), not just the primary, so one call covers
 * work + personal + subscribed calendars. A headless-safe alternative to
 * OAuth-connector based calendar access.
 *
 * Deploy as Web App: Execute as = Me, Access = Anyone (even anonymous).
 * Auth is the ?token= query param (NOT Google login), so the URL is safe to curl.
 */

// Token is read from Script Properties (set via setToken()), so this source
// carries no secret and is safe to keep in a repo.
function getToken_() {
  return PropertiesService.getScriptProperties().getProperty('AUTH_TOKEN') || '';
}

function doGet(e) {
  e = e || {};
  var p = e.parameter || {};
  if (!p.token || p.token !== getToken_()) {
    return jsonResponse_({ error: 'Unauthorized' }, 401);
  }
  var action = p.action || 'today';
  try {
    switch (action) {
      case 'calendars':
        return jsonResponse_({ calendars: listCalendars_() });
      case 'today':
        return eventsResponse_(dayRange_(0, 0), p);
      case 'tomorrow':
        return eventsResponse_(dayRange_(1, 1), p);
      case 'todayTomorrow':
        return eventsResponse_(dayRange_(0, 1), p);
      case 'week':
        return eventsResponse_(weekRange_(), p);
      case 'upcoming': {
        var hours = parseInt(p.hours, 10) || 4;
        var now = new Date();
        return eventsResponse_([now, new Date(now.getTime() + hours * 3600 * 1000)], p);
      }
      case 'range': {
        if (!p.start || !p.end) return jsonResponse_({ error: 'Missing start or end' }, 400);
        return eventsResponse_([new Date(p.start), new Date(p.end)], p);
      }
      case 'create':
        return jsonResponse_(createEvent_(p));
      case 'delete':
        return jsonResponse_(deleteEvent_(p));
      default:
        return jsonResponse_({ error: 'Unknown action: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse_({ error: String(err) }, 500);
  }
}

// Allow create via POST too (cleaner for bodies); same token rule.
function doPost(e) {
  return doGet(e);
}

function listCalendars_() {
  return CalendarApp.getAllCalendars().map(function (c) {
    return {
      id: c.getId(),
      name: c.getName(),
      isPrimary: c.isMyPrimaryCalendar(),
      isOwned: c.isOwnedByMe(),
      color: c.getColor()
    };
  });
}

// range = [startDate, endDate]; p may carry calendarId=<substr>,<substr> to filter.
function eventsResponse_(range, p) {
  var events = getAllEvents_(range[0], range[1], p && p.calendarId);
  return jsonResponse_({
    count: events.length,
    start: range[0].toISOString(),
    end: range[1].toISOString(),
    events: events
  });
}

function getAllEvents_(startDate, endDate, filterParam) {
  var filters = filterParam
    ? String(filterParam).split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean)
    : null;
  var cals = CalendarApp.getAllCalendars();
  var out = [];
  cals.forEach(function (cal) {
    var id = cal.getId();
    var name = cal.getName();
    if (filters && !filters.some(function (f) {
      return id.toLowerCase().indexOf(f) > -1 || name.toLowerCase().indexOf(f) > -1;
    })) return;
    var evs;
    try { evs = cal.getEvents(startDate, endDate); } catch (err) { return; }
    evs.forEach(function (ev) {
      var status = null;
      try { status = ev.getMyStatus() ? ev.getMyStatus().toString() : null; } catch (e2) {}
      out.push({
        calendarId: id,
        calendarName: name,
        id: ev.getId(),
        title: ev.getTitle(),
        start: ev.getStartTime().toISOString(),
        end: ev.getEndTime().toISOString(),
        location: ev.getLocation() || null,
        description: ev.getDescription() || null,
        isAllDay: ev.isAllDayEvent(),
        guests: ev.getGuestList().map(function (g) { return g.getEmail(); }),
        color: ev.getColor() || null,
        status: status
      });
    });
  });
  out.sort(function (a, b) { return a.start < b.start ? -1 : (a.start > b.start ? 1 : 0); });
  return out;
}

function createEvent_(p) {
  if (!p.title || !p.start || !p.end) {
    return { error: 'Missing title, start or end' };
  }
  var opts = {};
  if (p.description) opts.description = p.description;
  if (p.location) opts.location = p.location;
  if (p.guests) { opts.guests = p.guests; opts.sendInvites = (p.sendInvites !== 'false'); }
  var cal = null;
  if (p.calendarId) cal = CalendarApp.getCalendarById(p.calendarId);
  if (!cal) cal = CalendarApp.getDefaultCalendar();
  var ev = cal.createEvent(p.title, new Date(p.start), new Date(p.end), opts);
  if (p.color) { try { ev.setColor(String(p.color)); } catch (e3) {} }
  return {
    success: true,
    event: {
      id: ev.getId(),
      title: ev.getTitle(),
      start: ev.getStartTime().toISOString(),
      end: ev.getEndTime().toISOString(),
      calendarId: cal.getId(),
      calendarName: cal.getName()
    }
  };
}

function deleteEvent_(p) {
  if (!p.eventId) return { error: 'Missing eventId' };
  var cal = null;
  if (p.calendarId) cal = CalendarApp.getCalendarById(p.calendarId);
  if (!cal) cal = CalendarApp.getDefaultCalendar();
  var ev = cal.getEventById(p.eventId);
  if (!ev) return { error: 'Event not found on calendar ' + cal.getId() };
  var title = ev.getTitle();
  ev.deleteEvent();
  return { success: true, deleted: { id: p.eventId, title: title, calendarId: cal.getId() } };
}

// Today + dayOffset boundaries computed in the script timezone (set via the
// `timeZone` field in appsscript.json), so today/tomorrow align with local days.
function dayRange_(startOffsetDays, endOffsetDays) {
  var now = new Date();
  var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + startOffsetDays, 0, 0, 0);
  var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + endOffsetDays, 23, 59, 59);
  return [start, end];
}

function weekRange_() {
  var now = new Date();
  var start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); // Sunday
  start.setHours(0, 0, 0, 0);
  var end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

function jsonResponse_(data) {
  // Apps Script ContentService can't set HTTP status codes; status is echoed
  // in the body for clients that care. 200 is always returned on the wire.
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * One-time: store the auth token in Script Properties.
 * Run this once from the editor (it also triggers the Calendar OAuth consent).
 * Replace the placeholder with a secret you generate, e.g. `openssl rand -hex 24`.
 */
function setToken() {
  PropertiesService.getScriptProperties().setProperty('AUTH_TOKEN', 'YOUR_SECRET_TOKEN_HERE');
  // Touch Calendar so the authorization scope is granted during this run.
  CalendarApp.getAllCalendars();
  Logger.log('Token set; calendars visible: ' + CalendarApp.getAllCalendars().length);
}
