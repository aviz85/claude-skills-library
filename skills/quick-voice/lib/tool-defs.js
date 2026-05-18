// OpenAI Realtime tool definitions. The server hands a whitelisted subset to the
// client based on config.tools, and the client passes them into session.update().

const ALL_TOOLS = {
  canvas_show: {
    type: "function",
    name: "canvas_show",
    description:
      "Display content in the canvas area. Use this to show the user something visual — an image, a markdown doc, a code snippet, a JSON object, a video, etc. The user sees it in real time. Use for 'let's go over X' flows: call canvas_show for item 1, wait for the user's reaction, then canvas_show for item 2, etc.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["image", "markdown", "html", "code", "json", "video", "audio", "text", "url"],
          description: "Content type. image/video/audio use `source` (path or URL). markdown/html/code/json/text use `content` inline. url embeds a webpage in an iframe.",
        },
        source: { type: "string", description: "File path (absolute or relative to cwd) or URL. Used for image, video, audio, url types." },
        content: { type: "string", description: "Inline content. Used for markdown, html, code, json, text types." },
        title: { type: "string", description: "Optional title shown above the content." },
        language: { type: "string", description: "Language for code blocks (e.g. 'javascript', 'python')." },
      },
      required: ["type"],
    },
  },

  canvas_clear: {
    type: "function",
    name: "canvas_clear",
    description: "Clear the canvas. Use between topics or when starting fresh.",
    parameters: { type: "object", properties: {} },
  },

  save_note: {
    type: "function",
    name: "save_note",
    description:
      "Append a section to the session output document (output.md). Use this to record decisions, notes, action items, the user's reaction to something, or any takeaway that should survive the session. The final output.md is returned to the parent Claude session.",
    parameters: {
      type: "object",
      properties: {
        heading: { type: "string", description: "Short heading for this note (e.g. 'Image 3 — feedback', 'Decision: pricing')." },
        content: { type: "string", description: "The note body. Plain text or markdown." },
      },
      required: ["heading", "content"],
    },
  },

  end_session: {
    type: "function",
    name: "end_session",
    description:
      "End the voice session. Call this when the conversation is complete. Optionally pass a final summary that gets appended to output.md.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Optional final summary appended to output.md." },
      },
    },
  },

  read_file: {
    type: "function",
    name: "read_file",
    description: "Read a file from disk (under cwd). Returns its content as a string. Use to pull in data the user wants to discuss.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path, absolute or relative to cwd." },
      },
      required: ["path"],
    },
  },

  write_file: {
    type: "function",
    name: "write_file",
    description: "Write a file (overwrites existing). Use when the user explicitly wants to save something.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path, absolute or relative to cwd." },
        content: { type: "string", description: "File content." },
      },
      required: ["path", "content"],
    },
  },

  append_file: {
    type: "function",
    name: "append_file",
    description: "Append text to a file. Creates the file if missing.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path, absolute or relative to cwd." },
        content: { type: "string", description: "Text to append." },
      },
      required: ["path", "content"],
    },
  },

  update_json: {
    type: "function",
    name: "update_json",
    description:
      "Shallow-merge a patch object into the top-level object of a JSON file. The file's root must be a JSON object. Useful for surgically updating fields without rewriting whole files. For arrays-of-records, use array_update_json instead.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "JSON file path." },
        patch: { type: "object", description: "Object whose keys/values are merged into the JSON root." },
      },
      required: ["path", "patch"],
    },
  },

  array_update_json: {
    type: "function",
    name: "array_update_json",
    description:
      "Update one record in a JSON file whose root is either an array OR an object containing one array under a known key (like {customers: [...]} or {interactions: [...]}). Finds the record by `match_field` = `match_value` and merges `patch` into it.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        array_key: { type: "string", description: "If root is {x: [...]}, the key name 'x'. Omit if root itself is an array." },
        match_field: { type: "string", description: "Field name to match on (e.g. 'id')." },
        match_value: { type: "string", description: "Field value to match." },
        patch: { type: "object", description: "Fields to merge into the matched record." },
      },
      required: ["path", "match_field", "match_value", "patch"],
    },
  },

  list_dir: {
    type: "function",
    name: "list_dir",
    description: "List contents of a directory. Returns names + types (file/dir).",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path, absolute or relative to cwd." },
      },
      required: ["path"],
    },
  },

  run_bash: {
    type: "function",
    name: "run_bash",
    description:
      "Run a shell command in cwd. Use sparingly — prefer specific tools. Output is truncated to 4KB. Useful for git status, grep, find, jq, etc.",
    parameters: {
      type: "object",
      properties: {
        cmd: { type: "string", description: "Shell command (bash)." },
      },
      required: ["cmd"],
    },
  },
};

function selectTools(names) {
  if (!Array.isArray(names) || names.length === 0) return [];
  return names.map((n) => ALL_TOOLS[n]).filter(Boolean);
}

module.exports = { ALL_TOOLS, selectTools };
