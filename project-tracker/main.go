package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Models

type Project struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      string    `json:"status"` // Active, Completed, Archived
	Sessions    []Session `json:"sessions"`
}

type Session struct {
	ID        int       `json:"id"`
	ProjectID int       `json:"project_id"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time,omitempty"`
	Note      string    `json:"note"`
}

// Store

var (
	projects = []Project{
		{ID: 1, Name: "Website Redesign", Description: "Overhaul the corporate website", Status: "Active"},
		{ID: 2, Name: "Mobile App", Description: "Develop iOS and Android apps", Status: "Active"},
		{ID: 3, Name: "Legacy Cleanup", Description: "Refactor old codebase", Status: "Completed"},
	}
	sessions = []Session{}
	mu       sync.Mutex
)

func main() {
	// Seed some sessions
	sessions = append(sessions, Session{ID: 1, ProjectID: 1, StartTime: time.Now().Add(-2 * time.Hour), EndTime: time.Now().Add(-1 * time.Hour), Note: "Initial planning"})

	http.Handle("/", http.FileServer(http.Dir("./frontend/dist")))
	http.HandleFunc("/api/projects", handleProjects)
	http.HandleFunc("/api/projects/", handleProjectDetail)
	http.HandleFunc("/api/sessions", handleSessions)

	fmt.Println("Server starting on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleProjects(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(projects)
}

func handleProjectDetail(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Invalid URL", http.StatusBadRequest)
		return
	}
	idStr := parts[3]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid Project ID", http.StatusBadRequest)
		return
	}

	mu.Lock()
	defer mu.Unlock()

	var project *Project
	for i := range projects {
		if projects[i].ID == id {
			project = &projects[i]
			break
		}
	}

	if project == nil {
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}

	// Populate sessions for this project
	projectSessions := []Session{}
	for _, s := range sessions {
		if s.ProjectID == id {
			projectSessions = append(projectSessions, s)
		}
	}

	// Create a copy to avoid modifying the original project in the slice if we were using pointers differently,
	// but here we just want to return the struct with sessions populated for the response.
	responseProject := *project
	responseProject.Sessions = projectSessions

	json.NewEncoder(w).Encode(responseProject)
}

func handleSessions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ProjectID int    `json:"project_id"`
		Note      string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	mu.Lock()
	defer mu.Unlock()

	newSession := Session{
		ID:        len(sessions) + 1,
		ProjectID: req.ProjectID,
		StartTime: time.Now(),
		Note:      req.Note,
	}
	sessions = append(sessions, newSession)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newSession)
}
