package handler

import (
	"embed"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// ---------------------------------------------------------------------------
// Embed static data into the binary at compile time.
// go:embed directives must be in the same package as the Handler function.
// ---------------------------------------------------------------------------

//go:embed data/projects.json
var projectsJSON []byte

//go:embed data/content
var contentFS embed.FS

// ---------------------------------------------------------------------------
// Handler is the Vercel Serverless Function entry point.
// Routes:
//
//	GET /api/projects              → full projects.json
//	GET /api/projects?id=xxx       → single project by id
//	GET /api/projects?id=xxx&lang=zh|en → markdown content for that project
//
// ---------------------------------------------------------------------------
func Handler(w http.ResponseWriter, r *http.Request) {
	// Health check shortcut
	if r.URL.Path == "/api/health" {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
		return
	}

	id := r.URL.Query().Get("id")
	lang := r.URL.Query().Get("lang")

	// ── /api/projects?id=xxx&lang=zh|en  →  return markdown content ──────────
	if id != "" && lang != "" {
		serveMarkdown(w, id, lang)
		return
	}

	// ── /api/projects?id=xxx  →  return single project JSON ──────────────────
	if id != "" {
		serveProjectByID(w, id)
		return
	}

	// ── /api/projects  →  return full list ───────────────────────────────────
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Write(projectsJSON)
}

// serveMarkdown reads the embedded .md file for the given project id.
// File naming convention: data/content/<id>.md
// (lang parameter is accepted for forward-compatibility; currently one file per project)
func serveMarkdown(w http.ResponseWriter, id, lang string) {
	// sanitize id — only allow alphanumeric, dash, underscore
	for _, c := range id {
		if !isAlphaNumDash(c) {
			http.Error(w, "invalid id", http.StatusBadRequest)
			return
		}
	}

	filename := fmt.Sprintf("data/content/%s.md", id)
	data, err := contentFS.ReadFile(filename)
	if err != nil {
		http.Error(w, "content not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.Write(data)
}

// serveProjectByID filters the embedded projects.json and returns one entry.
func serveProjectByID(w http.ResponseWriter, id string) {
	var projects []map[string]interface{}
	if err := json.Unmarshal(projectsJSON, &projects); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	for _, p := range projects {
		if pid, ok := p["id"].(string); ok && pid == id {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			json.NewEncoder(w).Encode(p)
			return
		}
	}

	http.Error(w, "project not found", http.StatusNotFound)
}

func isAlphaNumDash(c rune) bool {
	return (c >= 'a' && c <= 'z') ||
		(c >= 'A' && c <= 'Z') ||
		(c >= '0' && c <= '9') ||
		c == '-' || c == '_'
}

// stripLang is kept for future bilingual MD support.
// When you split files into <id>_zh.md / <id>_en.md, update serveMarkdown to use it.
func stripLang(s string) string {
	return strings.TrimSpace(s)
}
