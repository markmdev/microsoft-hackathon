# Ross 🚲

**AI-powered client acquisition for personal injury lawyers**

## Overview

Ross is a fullstack AI agent that transforms how personal injury law firms identify and engage potential clients. The system ingests public police reports, intelligently extracts actionable leads, and orchestrates multi-channel outreach campaigns through email, direct mail, and AI-powered phone calls.

Rather than manually reviewing hundreds of incident reports, lawyers can use natural language to filter prospects by criteria like location, injury severity, insurance coverage, and incident type. Once qualified leads are identified, Ross automates the entire outreach workflow—from drafting personalized communications to scheduling consultations via AI voice agents.

## Fullstack Agent

Ross exemplifies fullstack agent integration through three core capabilities:

**Structured Reasoning**: LlamaIndex orchestrates complex document processing pipelines, transforming unstructured police reports into queryable, actionable intelligence. The agent maintains context across multiple data sources and applies domain-specific legal heuristics to surface high-value leads.

**Real-World Actions**: Through Composio and MCP integrations, Ross executes tangible business operations—sending emails via Resend, initiating direct mail through PostGrid/Lob APIs, conducting phone outreach with Vapi voice agents, and synchronizing appointment data to Google Sheets and Cal.com.

**Dynamic Frontend**: CopilotKit and AG-UI power an adaptive interface that responds to natural language queries. The UI dynamically generates filtered views, data visualizations, and action buttons based on user intent, eliminating the need for complex form-based interfaces.

## Core Features

- **Automated Report Processing**: Ingests police reports and extracts structured data including parties involved, incident details, injury descriptions, insurance information, and contact details
- **Intelligent Lead Summarization**: Generates concise, lawyer-focused summaries highlighting case viability factors
- **Natural Language Filtering**: Enables conversational queries like "show me rear-end collisions in downtown with documented injuries and commercial insurance"
- **Multi-Channel Outreach Orchestration**: Executes personalized campaigns across email, physical mail, and voice channels
- **AI Voice Agent**: Conducts initial prospect calls, explains services, and books consultations directly into the lawyer's calendar
- **Automated CRM Updates**: Logs all interactions and outcomes to Google Sheets for tracking and compliance

## User Flows

### Lead Discovery Flow
1. System continuously ingests new police reports (currently using synthetic dataset)
2. LlamaIndex agent processes each report, extracting entities and relationships
3. Leads appear in dashboard with AI-generated summaries and viability scores
4. Lawyer reviews leads in spreadsheet view with inline chat assistance

### Lead Qualification Flow
1. Lawyer enters natural language filter in sidebar chat interface
2. CopilotKit interprets query and dynamically adjusts displayed results
3. System highlights matching criteria within each lead summary
4. Lawyer can iteratively refine filters through conversation

### Outreach Execution Flow
1. Lawyer selects qualified leads and chooses outreach channel
2. For email: System drafts personalized message, lawyer reviews/edits, sends via Resend
3. For direct mail: Generates letter content, initiates print/mail via PostGrid API
4. For phone: Vapi agent places call, introduces firm, attempts consultation booking

### Voice Agent Call Flow
1. Vapi agent calls prospect using provided phone number
2. Introduces law firm and explains potential assistance based on incident type
3. Offers free consultation and checks availability
4. Books appointment via Cal.com integration if prospect agrees
5. Logs call outcome (contacted/not contacted, appointment status, notes) to Google Sheets

## Tech Stack

- **LlamaIndex**: Agent orchestration, document processing, knowledge retrieval
- **Composio**: Tool integration layer for Google Sheets, Resend, Vapi connections
- **CopilotKit/AG-UI**: Conversational interface and dynamic UI generation
- **Vapi**: Voice agent automation and telephony
- **Next.js**: Full-stack React framework
- **TypeScript**: Type-safe development
- **Cal.com**: Calendar integration for appointment scheduling

## Current Scope

The prototype demonstrates core capabilities using 100 synthetic police reports. Production deployment will integrate with police department portals for real-time report acquisition. Initial version focuses on basic outreach and scheduling—appointment modifications and follow-up sequences are planned for future releases.