# TaxOps ZA Coding Course

## Introduction

This course teaches coding from beginner to early professional level by using the TaxOps ZA codebase as the teaching example.

You do not need prior programming knowledge.

This course will help you understand:

- what code is
- how a real application is organized
- how to read folders and files without panic
- how user actions become software behavior
- how to understand frontend, backend, database, and desktop app structure
- how professional developers think about testing, debugging, and architecture

This is not only a theory course. It uses the real TaxOps ZA app as the live example.

Important project files used throughout the course:

- `README.md`
- `package.json`
- `src/app/layout.tsx`
- `src/app/(protected)/estates/[estateId]/valuation/page.tsx`
- `src/modules/estates/service.ts`
- `src/app/api/reports/estates/[estateId]/filing-pack/route.ts`
- `prisma/schema.prisma`
- `desktop/main.cjs`
- `src/modules/estates/service.test.ts`

---

## Lesson 1: What Coding Is

### Main idea

Coding is the act of writing instructions for a computer.

A computer has no business judgment and no common sense. It follows instructions exactly.

That means:

- good instructions produce useful results
- bad instructions produce mistakes

### What a program is

A program is a collection of files that work together to solve a problem.

TaxOps ZA solves problems such as:

- tracking clients
- managing tax cases
- handling estates
- calculating tax
- generating reports
- packaging the system as a desktop app

### What a codebase is

A codebase is the full collection of source files, configuration files, tests, and documentation that make up the program.

### Mental model

Think of the codebase as an office building:

- one room handles reception
- one room handles finance
- one room handles records
- one room handles printing
- one room handles management

The code is similar. Different folders do different jobs.

### Key beginner words

- `file`: one text document containing code
- `folder`: a place that groups files
- `function`: a named block of instructions
- `input`: information given to code
- `output`: result returned by code
- `bug`: unwanted behavior

### Exercise

In your own words, answer:

1. What is the difference between a program and a codebase?
2. Why is code split into many files?

---

## Lesson 2: What This App Is Doing

### Business purpose

TaxOps ZA is a South African tax and estate workflow platform.

It helps users manage work such as:

- client management
- SARS workflow cases
- individual tax
- ITR12 workflows
- deceased estates
- filing pack generation

### Why business meaning matters

If you read code without understanding the business problem, the code feels random.

When you understand the business problem, the code becomes easier to follow.

Example:

If you know an estate matter has:

- assets
- liabilities
- beneficiaries
- stages
- reports

then classes, functions, and screens with those names will make sense.

### Five technical layers in this app

1. Screen layer
This is what users see and interact with.

2. Route layer
This decides which screen appears for each URL.

3. Business logic layer
This applies rules such as creating estates, approving runs, and generating filing packs.

4. Data layer
This stores and loads information.

5. Desktop platform layer
This lets the whole web app run as a Windows desktop application.

### Exercise

Explain the difference between:

- a business rule
- a screen
- stored data

---

## Lesson 3: Learning the Project Root

### Start with the top level

Important root items:

- `README.md`
- `package.json`
- `src`
- `prisma`
- `desktop`
- `docs`
- `tests`

### What each root item means

#### `README.md`

This is the project introduction for humans.

It explains:

- what the app is
- how to run it
- what tech is used

#### `package.json`

This is the control panel for scripts, dependencies, and desktop packaging.

#### `src`

This is the main source code.

#### `prisma`

This holds database structure and sample data scripts.

#### `desktop`

This contains Electron runtime files for the Windows application shell.

#### `docs`

This contains planning and design records.

#### `tests`

This contains automated checks.

### The most important beginner habit

Always start a new codebase by understanding:

- what the root folders mean
- what command starts the app
- where the real source code lives

### Exercise

Write one sentence explaining each of these:

- `src`
- `prisma`
- `desktop`
- `tests`

---

## Lesson 4: Understanding `package.json`

File:

`package.json`

### Why this file matters

This file tells you:

- how to run the project
- what libraries it needs
- how the desktop app is packaged

### Important sections

#### `name`

The internal project name.

#### `version`

The project version.

#### `scripts`

Named commands.

Examples in this project:

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run desktop:bundle`

These are shortcuts so developers do not have to remember every full command.

#### `dependencies`

Libraries needed at runtime.

Examples:

- `next`
- `react`
- `next-auth`
- `@prisma/client`
- `jszip`
- `docx`

#### `devDependencies`

Libraries mainly used during development.

Examples:

- `typescript`
- `eslint`
- `vitest`
- `electron-builder`

#### `build`

The desktop packaging configuration.

This tells Electron Builder what to package and what the app should be called.

### Why scripts are important

If you want to understand a project quickly, scripts tell you what the development team does repeatedly.

### Exercise

Answer:

1. Which command builds the project?
2. Which command runs tests?
3. Which command prepares the desktop app?
4. Why do you think `electron-builder` is in `devDependencies` and not `dependencies`?

---

## Lesson 5: Understanding `src`

### The core source folders

Inside `src`, the major folders are:

- `app`
- `components`
- `modules`
- `lib`
- `server`
- `types`
- `desktop`
- `test`

### `src/app`

This is the route system.

Use it when asking:

- where does this page come from?
- what URL opens this screen?

### `src/components`

This is the UI parts library.

Use it when asking:

- what visual pieces make up this page?

### `src/modules`

This is the business logic area.

Use it when asking:

- where do the real rules live?
- where is calculation logic handled?
- where is validation handled?

### `src/lib`

Shared infrastructure code.

Use it when asking:

- where is auth configured?
- where is the database helper?
- where are shared utilities?

### `src/server`

Server-side demo data and app scaffolding.

### `src/types`

Shared type definitions used across the project.

### Exercise

If you want to find where estate stage advancement rules are enforced, which folder would you check first, and why?

---

## Lesson 6: Understanding Pages and Routes

### What a route is

A route is the address that opens a page.

Example:

`/estates/[estateId]/valuation`

This opens the valuation workspace for one estate.

### How routes are stored

In Next.js App Router, folders and files define routes.

That means the folder structure is not random. It is part of the program behavior.

### Real example

File:

`src/app/(protected)/estates/[estateId]/valuation/page.tsx`

This file is the page for:

an authenticated user viewing the valuation workspace for one estate.

### Why `page.tsx` matters

A `page.tsx` file is normally the main file for one route.

### Why route folders can contain brackets

`[estateId]` means:

"This part changes depending on which estate is being requested."

That is a dynamic route parameter.

### Exercise

Explain in plain language what `[estateId]` means.

---

## Lesson 7: Understanding Layouts

File:

`src/app/layout.tsx`

### What a layout is

A layout is the wrapper around pages.

It provides shared structure like:

- fonts
- providers
- base HTML structure

### Why layouts exist

Without a layout, every page would have to repeat the same outer setup.

That would be messy and hard to maintain.

### Key ideas from the file

- imports fonts
- imports `Providers`
- exports site metadata
- wraps `children`

### What `children` means

`children` means:

the page content placed inside the layout.

### Professional lesson

Good architecture separates:

- global app structure
- page-specific content

### Exercise

Why is it better to set fonts in a shared layout instead of inside every page?

---

## Lesson 8: Understanding Components

### What a component is

A component is a reusable UI building block.

Examples:

- a card
- a button
- a table
- an estate workspace section

### Why components matter

If a system repeats the same visual pattern many times, it should usually become a reusable component.

That reduces duplication.

### How to recognize a component

A component file usually:

- accepts props
- returns JSX
- focuses on presentation

### Real app example

The valuation page uses components such as:

- `EstateWorkspaceLayout`
- `EngineReviewPanel`
- `EstateValuationWorkspace`
- `Card`

### Beginner mistake to avoid

Do not assume all code in a page file belongs there permanently. Pages often become cleaner by moving repeated UI into components.

### Exercise

Name one benefit of a reusable component library in a large app.

---

## Lesson 9: Understanding Form Input and Data Cleaning

### Why form input is messy

Browsers send form values as general values, often text.

That means the server often receives:

- numbers as text
- empty values as blank strings
- checkboxes as on/off values

### Real example

In the valuation page, helper functions such as:

- `readRequiredString`
- `readOptionalString`
- `readOptionalNumber`
- `readBoolean`

exist to clean the incoming data.

### Why this is important

Business logic works best with clean data.

Example:

- the text `"100"` is not the same thing as the number `100`
- an empty string is not the same thing as missing data

### Professional lesson

Never trust raw input.

Clean it first.
Validate it next.
Only then pass it into business logic.

### Exercise

Why do you think `readOptionalNumber` returns `undefined` for blank values instead of returning `0`?

---

## Lesson 10: Understanding Services and Business Logic

File:

`src/modules/estates/service.ts`

### What a service layer is

A service layer handles business events and rules.

Examples in this file:

- create estate
- add asset
- add liability
- add beneficiary
- update checklist status
- advance estate stage
- issue executor access

### Why business logic should live here

Because rules must stay correct no matter which screen or route calls them.

If a rule only lives in the UI, it can be bypassed.

### Example: `createEstate`

This function does more than “save one row.”

It:

1. validates input
2. finds the firm id
3. builds the estate reference
4. creates a linked client
5. creates the estate
6. builds checklist items
7. creates a stage event
8. reloads the estate
9. writes an audit log

This is a professional pattern:

one business event may require many system actions.

### Example: `advanceEstateStage`

This function:

- loads the estate
- validates readiness
- updates the stage
- records a stage event
- writes an audit record

### Beginner lesson

When you see a service function, ask:

- what real-world action is this code modeling?
- what checks happen first?
- what side effects happen after the main action?

### Exercise

Why is `advanceEstateStage` better placed in a service file than directly inside a UI component?

---

## Lesson 11: Understanding Validation

### What validation is

Validation means checking whether data is acceptable before using it.

In this app, validation appears in places like:

- Zod schemas
- stage readiness checks
- helper functions

### Why validation matters in tax software

Because tax and estate data is sensitive. If the system accepts invalid data carelessly, the downstream calculations and reports become unreliable.

### Types vs validation

This is an important beginner distinction.

- Types help developers and the compiler understand expected shapes
- Validation checks actual incoming values at runtime

Both are useful, but they are not the same.

### Exercise

In one sentence, explain the difference between a type and validation.

---

## Lesson 12: Understanding the Database Blueprint

File:

`prisma/schema.prisma`

### Why this file matters

This is one of the most important files in the whole system because it defines the shape of stored data.

### Main concepts inside the schema

#### Generator

Tells Prisma to generate code for talking to the database.

#### Datasource

Tells Prisma which database engine to use and where to find it.

#### Enums

Controlled value lists.

Examples:

- `EstateStage`
- `CaseStatus`
- `RoleCode`

#### Models

Database record types.

Examples:

- `User`
- `Client`
- `EstateMatter`
- `Case`
- `Document`

### Why relationships matter

An estate is not isolated. It links to:

- assets
- liabilities
- beneficiaries
- checklist items
- stage events
- engine runs

This is how the app knows which records belong together.

### Beginner lesson

A database schema is the structural truth of the app.

If you understand the schema, you understand what the app is able to remember.

### Exercise

List three things an `EstateMatter` is connected to.

---

## Lesson 13: Understanding Repositories and Data Access

### What a repository is

A repository is a layer whose job is to read and write data.

Service layer:

- decides what should happen

Repository layer:

- performs the actual storage and retrieval work

### Why this separation is useful

It keeps business rules separate from data mechanics.

That makes the code easier to:

- test
- replace
- maintain

### Beginner lesson

A helpful rule is:

- page = route behavior
- component = visible UI
- service = business decision
- repository = data access

---

## Lesson 14: Understanding API Routes

Real example:

`src/app/api/reports/estates/[estateId]/filing-pack/route.ts`

### What an API route is

An API route is a server endpoint.

It usually does not render a full visual page. Instead, it returns:

- JSON
- a file
- an error response

### What this route does

This route generates:

- single filing-pack artifacts
- PDFs
- Word documents
- manifests
- ZIP bundles

### What it teaches

This file combines:

- request parsing
- output format rules
- report rendering
- file storage
- audit logging
- response building

### Beginner lesson

This route is a good example of server orchestration.

It receives a request, asks the business layer what the result should be, packages the result, and sends it back.

### Exercise

What is the difference between a page route and an API route?

---

## Lesson 15: Understanding Report Generation

### Why reporting code is special

Report generation sits between business logic and user output.

The app must:

- calculate or fetch the right data
- map the data into the report structure
- render it into PDF, DOCX, or JSON
- store the file
- let the user download, open, or print it

### What this teaches you

Software is often not just “store data and show data.”

Sometimes it transforms data into artifacts.

That is a higher-level engineering skill.

### Real examples in this app

- estate valuation report
- CGT on death schedule
- estate duty summary
- Master liquidation and distribution account
- filing pack ZIP

### Exercise

Why do you think the app stores generated report files instead of only showing them in memory once?

---

## Lesson 16: Understanding the Desktop App Layer

File:

`desktop/main.cjs`

### What Electron is doing here

Electron wraps the web app inside a desktop shell.

That means:

- the user launches an `.exe`
- Electron opens a desktop window
- the Next.js app runs inside it

### Key ideas in the file

- single app instance lock
- startup logging
- local standalone server startup
- desktop window creation
- safe file open/print/save actions
- error handling during startup

### Why this matters for your learning

This app teaches that software can have multiple runtime layers:

- browser-like UI
- server logic
- desktop shell

### Exercise

Explain in one sentence what job Electron is doing in this project.

---

## Lesson 17: Understanding Testing

Real example:

`src/modules/estates/service.test.ts`

### What a test is

A test is a coded expectation about how the program should behave.

### Why tests matter

Without tests, every change risks breaking old features silently.

### What this test file teaches

It checks behaviors like:

- estate creation
- adding assets and beneficiaries
- liquidation entries
- executor access
- stage advancement

### Why test names matter

A good test name acts like a sentence describing business behavior.

That makes tests easier to learn from.

### Beginner lesson

If you are confused by implementation code, read tests first.

Tests often show:

- what input is given
- what function is called
- what result is expected

### Exercise

Why are tests especially important in tax and estate software?

---

## Lesson 18: Understanding Debugging

### What debugging is

Debugging is the process of finding and fixing the cause of a problem.

### A beginner-safe debugging method

1. Reproduce the problem
2. Find where it happens
3. Inspect the inputs
4. Inspect the expected output
5. Compare expected vs actual
6. Change one thing at a time
7. Retest

### Example from this app

A valuation page crash might come from:

- bad form input
- wrong validation
- a redirect problem
- report generation
- desktop file handling

The developer should not guess. They should trace the flow.

### Professional lesson

Good debugging is systematic, not emotional.

---

## Lesson 19: Making Your First Safe Code Changes

### Beginner-safe change types

Good first changes are:

- rename labels
- improve help text
- add comments in documentation
- change a heading
- add a very small validation message

### Unsafe beginner change types

Avoid first touching:

- low-level build configuration
- authentication core
- large report pipelines
- database schema changes without guidance

### Safe change workflow

1. Read the related file
2. Read tests
3. Make one small change
4. Run tests
5. Confirm the result

### Exercise

Choose one safe first change you would be comfortable making after this course.

---

## Lesson 20: Thinking Like a Professional Developer

### A professional mindset is not only about syntax

Professional developers think in terms of:

- structure
- clarity
- correctness
- maintainability
- testing
- risk

### Questions professionals ask

- Is this logic in the right layer?
- Is the name clear?
- Can someone else understand this later?
- What happens if input is wrong?
- Do we need a test for this?
- If this fails in production, how will we know?

### Strong patterns already visible in this app

- service layer separation
- validation before important actions
- audit logging
- desktop/browser boundary handling
- report-generation pipelines
- test coverage

### Beginner lesson

You do not become professional by memorizing more syntax.

You become professional by making better decisions.

### Exercise

Pick one professional habit from this lesson and explain why it matters.

---

## Lesson 21: How to Study Any New File in This Repo

Use this study checklist:

1. Read the file path
2. Identify the file role
3. Read the imports
4. Find the main function or export
5. Find helper functions
6. Find side effects
7. Find inputs and outputs
8. Ask which layer this file belongs to

### Layer examples

- `src/app/...`: route layer
- `src/components/...`: UI layer
- `src/modules/...`: business logic layer
- `prisma/...`: data structure layer
- `desktop/...`: platform layer

### Exercise

Use the checklist on `desktop/main.cjs` or `src/modules/estates/service.ts`.

---

## Lesson 22: A 30-Day Learning Roadmap

### Week 1: Learn to read

Focus on:

- root files
- `package.json`
- `README.md`
- `src/app/layout.tsx`

Goal:

Understand how the project starts and how pages are organized.

### Week 2: Learn how pages and services connect

Focus on:

- valuation page
- one component file
- `src/modules/estates/service.ts`

Goal:

Trace a user action from screen to service.

### Week 3: Learn data and reports

Focus on:

- `prisma/schema.prisma`
- filing-pack route
- report-related files

Goal:

Understand how structured data becomes reports.

### Week 4: Learn testing and safe edits

Focus on:

- test files
- one tiny code change
- lint/test/build workflow

Goal:

Move from reader to careful contributor.

---

## Lesson 23: Your First Mini Projects

After this course, good practice projects inside this app are:

1. Change a button label and run tests
2. Add helper text to a form field
3. Add one glossary explanation to documentation
4. Trace one route end to end and explain it in your own words
5. Add a very small test for an already existing behavior

These are small enough to be safe and large enough to teach real skills.

---

## Lesson 24: Final Summary

You have now covered:

- what programming is
- what this app does
- how the repo is structured
- how pages, components, services, database schema, API routes, desktop files, and tests fit together
- how to read files without getting overwhelmed
- how to think more like a professional developer

### The most important final idea

Real programming is mostly about understanding systems and making good decisions, not just writing lines of code.

TaxOps ZA is a strong learning codebase because it includes:

- frontend pages
- reusable components
- backend services
- data modeling
- report generation
- desktop packaging
- testing

If you keep reading this codebase carefully and making small safe changes, you will build real engineering skill.

---

## Appendix A: Beginner Glossary

### Function

A named block of instructions.

### Variable

A named place to store a value.

### Parameter

An input given to a function.

### Return value

The output produced by a function.

### Component

A reusable UI building block.

### Route

The address that opens a page or endpoint.

### API

A way for one part of software to communicate with another.

### Schema

A formal description of data structure.

### Database

A system for storing structured information.

### Validation

Checking whether data is acceptable.

### Test

Code that checks expected behavior.

### Build

The process of preparing the app for production use.

### Dependency

A package or module the project relies on.

### Runtime

The environment in which the program is currently running.

### Electron

A framework that packages web apps as desktop apps.

---

## Appendix B: Best Files to Revisit After This Course

Revisit these in order:

1. `package.json`
2. `src/app/layout.tsx`
3. `src/app/(protected)/estates/[estateId]/valuation/page.tsx`
4. `src/modules/estates/service.ts`
5. `prisma/schema.prisma`
6. `desktop/main.cjs`
7. `src/app/api/reports/estates/[estateId]/filing-pack/route.ts`
8. `src/modules/estates/service.test.ts`

If you can explain those files clearly, you are no longer at zero.

---

## Appendix C: Suggested Next Guided Session

The best next guided teaching session after this PDF is:

1. read one file together
2. explain every import
3. explain every function
4. explain every return value
5. connect it to the app behavior
6. make one small safe change
7. run one test

That is the best bridge from theory to real coding practice.
