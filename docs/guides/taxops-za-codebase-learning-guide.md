# TaxOps ZA Codebase Learning Guide

## How to Use This Guide

This guide teaches programming from zero by using the TaxOps ZA app as the example. It is written for a person who has never coded before.

The idea is simple:

- first understand what software is
- then understand what this tax app is doing
- then understand how the folders and files are arranged
- then learn how to read important files line by line
- then learn how professional developers think

You do not need to memorize everything in one sitting. Read it in order once. After that, return to the sections that match the code you are looking at.

---

## Part 1: What Programming Actually Is

### The shortest plain-language definition

Programming is writing instructions for a computer.

A computer is very fast and very consistent, but it is not naturally smart. It does exactly what the instructions say.

If the instructions are:

- clear, the program works
- unclear, the program breaks
- incomplete, the program stops halfway
- wrong, the program does the wrong thing very consistently

### What a program is

A program is a set of files that work together to solve a problem.

In this app, the problem is:

- manage tax clients
- manage SARS workflow cases
- calculate tax outputs
- manage deceased estate workflows
- generate reports and filing packs
- run as a desktop app, not only in a browser

### What code is

Code is just text written in a programming language.

In this app, the main languages are:

- `TypeScript`: the main application language
- `JavaScript`: used in some desktop files
- `Prisma schema language`: describes the database
- `Markdown`: documentation

### Why there are many files

Software is split into files because each file usually has one job.

Examples:

- one file defines the database structure
- one file draws a page
- one file calculates tax
- one file saves data
- one file tests the code

If everything lived in one file, nobody could understand it.

---

## Part 2: What This Tax App Is in Business Terms

TaxOps ZA is a business workflow system for South African tax and estate work.

It helps a practitioner do work like:

- onboard a client
- open a case
- record documents
- calculate individual tax
- manage a deceased estate
- run estate valuation, pre-death tax, CGT on death, estate duty, post-death tax
- create formal outputs such as filing pack reports
- run all of that inside a desktop application

This matters because code is easier to understand when you first understand the business purpose.

### A useful mental model

Think of the app as five layers:

1. The screen layer
This is what the user sees and clicks.

2. The page and route layer
This decides which screen to show when a user opens a URL.

3. The business logic layer
This contains the real rules and actions, such as creating an estate or generating a filing pack.

4. The data layer
This stores and retrieves data from demo storage or the database.

5. The platform layer
This makes the app run inside Electron as a Windows desktop application.

---

## Part 3: The Whole Codebase at a High Level

### Top-level folder map

At the project root, the important parts are:

- `src`
- `prisma`
- `desktop`
- `docs`
- `tests`
- `public`
- `package.json`
- `README.md`

### What each top-level part means

#### `src`

This is the main app source code.

It contains:

- pages
- reusable UI pieces
- business logic
- shared utilities
- type definitions

If you only remember one folder, remember `src`.

#### `prisma`

This describes the database structure and seed data.

It answers questions like:

- what is a `Client`?
- what is an `EstateMatter`?
- what fields does an `EstateAsset` have?
- how are users related to cases?

#### `desktop`

This is the Electron desktop shell.

It answers questions like:

- how do we launch the app as a Windows program?
- how does the desktop app open files and print?
- how does it start the web server inside the desktop runtime?

#### `docs`

This is project documentation.

It contains design and implementation notes so the team can explain why things were built in a certain way.

#### `tests`

This is where automated checks live.

Tests are how developers prove that code still works after changes.

#### `public`

This contains static assets such as files that are served directly.

#### `package.json`

This is the project control file.

It describes:

- the project name
- dependencies
- scripts such as `npm run build`
- desktop packaging configuration

---

## Part 4: The Main Folders Inside `src`

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

This is the Next.js App Router area.

Plain-language meaning:

- it decides which page appears for each route
- it holds layouts and route files
- it acts like the site map of the app

Important subfolders:

- `src/app/(auth)`: authentication-related pages
- `src/app/(protected)`: logged-in app pages
- `src/app/api`: server endpoints
- `src/app/executor`: executor-facing read-only routes
- `src/app/reports`: report display routes

### `src/components`

These are reusable building blocks for screens.

Examples:

- cards
- forms
- buttons
- tables
- estate dashboards
- report views

Plain-language meaning:

If `app` says which page to show, `components` says what pieces appear on that page.

### `src/modules`

This is the business logic heart of the app.

Each module groups code by business domain, not by screen.

Examples:

- `clients`
- `cases`
- `documents`
- `estates`
- `individual-tax`
- `itr12`

This is where you usually find:

- services
- validation
- repositories
- calculators

### `src/lib`

This is shared infrastructure code.

Examples:

- environment loading
- authentication options
- database access
- helper functions

### `src/server`

This contains demo-mode server data and other app-wide server-side scaffolding.

### `src/types`

This contains shared type definitions. A type tells the program what shape data should have.

### `src/desktop`

This contains desktop-related tests or supporting code that belongs with the application source instead of the Electron runtime scripts themselves.

### `src/test`

This contains shared test helpers and setup utilities.

---

## Part 5: How a User Action Becomes Software Behavior

This is one of the most important programming ideas.

Let us use a real example: a user runs a business valuation for an estate.

### Step 1: The user opens a route

The user opens something like:

`/estates/[estateId]/valuation`

This route is handled by:

`src/app/(protected)/estates/[estateId]/valuation/page.tsx`

### Step 2: The page loads data

The page asks for:

- the estate record
- prior engine runs
- the logged-in session

It does that by calling service and repository functions.

### Step 3: The page renders components

The page uses reusable components like:

- `EstateWorkspaceLayout`
- `EngineReviewPanel`
- `EstateValuationWorkspace`

These components draw the visible screen.

### Step 4: The user submits a form

The valuation form collects values such as:

- valuation date
- subject description
- enabled valuation methods
- DCF numbers
- NAV numbers
- assumptions

### Step 5: Server-side business logic runs

The form data is read and passed to:

- `estateValuationService.createValuationRun(...)`

This is the business logic layer.

### Step 6: Data is stored

The service stores the run output through the estate data layer.

### Step 7: The page is refreshed

The app revalidates routes and reloads the updated view.

### Step 8: Reports can now be generated

The app can then build PDF or Word outputs through:

- filing pack services
- report routes
- desktop file actions

That is the basic life cycle of modern full-stack app development:

- route
- UI
- form submission
- service
- storage
- refreshed UI
- output generation

---

## Part 6: Deep Dive 1 - `package.json`

File:

`package.json`

This file is like the project control panel.

Here is the shape of the file in plain language:

```json
{
  "name": "sa-tax-platform",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  },
  "dependencies": {},
  "devDependencies": {},
  "build": {}
}
```

### Line-by-line idea breakdown

#### `"name": "sa-tax-platform"`

This is the internal package name of the project.

#### `"version": "0.1.0"`

This is the project version number.

#### `"main": "desktop/main.cjs"`

This tells Electron which file is the desktop entry point.

That means:

- when the desktop app starts
- Electron begins with `desktop/main.cjs`

#### `"scripts"`

Scripts are named commands. They save time because the team can run:

- `npm run dev`
- `npm run build`
- `npm run test`

instead of remembering long command strings.

Important scripts here:

- `dev`: runs the Next.js web app in development mode
- `build`: creates the production build
- `desktop:dev`: runs desktop development mode
- `desktop:bundle`: builds the app and prepares the standalone desktop runtime
- `desktop:start`: starts the packaged-style desktop runtime locally
- `desktop:dist`: creates the installer
- `lint`: checks code quality rules
- `test`: runs unit tests
- `db:generate`: generates Prisma client code
- `db:migrate`: updates the database schema
- `db:seed`: inserts sample data

#### `"dependencies"`

These are packages needed when the app runs.

Examples:

- `next`
- `react`
- `next-auth`
- `@prisma/client`
- `jszip`
- `docx`

Plain-language meaning:

The app cannot properly run without these.

#### `"devDependencies"`

These are mostly tools for development, not for the running app.

Examples:

- `vitest`
- `eslint`
- `electron-builder`
- `typescript`

Plain-language meaning:

These help developers build, test, and package the app.

#### `"build"`

This section is Electron Builder configuration.

It describes:

- app name
- desktop output folder
- which files to package
- Windows installer settings

This is why the project can become a real Windows executable.

### Beginner lesson

When you see `package.json`, ask:

- what commands can I run?
- what libraries does this app rely on?
- is this a web app, a desktop app, or both?

In this project, the answer is both.

---

## Part 7: Deep Dive 2 - `src/app/layout.tsx`

File:

`src/app/layout.tsx`

This is the root layout for the whole app.

Actual structure:

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans, Libre_Baskerville } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";
```

### What these lines mean

#### `import ...`

`import` means:

"Bring code from another file or package so I can use it here."

This file imports:

- `Metadata` type from Next.js
- fonts from Google font helpers
- the `Providers` wrapper
- global CSS styles

#### Fonts

```tsx
const plexSans = IBM_Plex_Sans(...)
const libre = Libre_Baskerville(...)
```

This creates font configurations.

Plain-language meaning:

- choose the fonts
- store their CSS variable names
- make them usable in the page layout

#### Metadata

```tsx
export const metadata: Metadata = {
  title: "TaxOps ZA",
  description: "South African tax compliance and SARS workflow management platform",
};
```

This tells Next.js the page title and description for the app.

#### Root layout function

```tsx
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
```

This is the main wrapper function.

Important meanings:

- `export default`: this is the main thing this file provides
- `function RootLayout`: define a reusable function component
- `children`: whatever page content is inside the layout

Plain-language meaning:

"Wrap every page of the app inside this common outer structure."

#### HTML and body

```tsx
return (
  <html lang="en">
    <body className={`${plexSans.variable} ${libre.variable} antialiased`}>
      <Providers>{children}</Providers>
    </body>
  </html>
);
```

This means:

- create the outer HTML document
- apply fonts and smoothing to the body
- wrap all pages in `Providers`

### What `Providers` means

In React and Next.js, a provider usually shares important app-wide data or capabilities.

Examples:

- authentication
- theme
- global state
- notifications

### Beginner lesson

This file teaches an important architecture idea:

some files are not business logic at all. Their job is to create the environment around every page.

---

## Part 8: Deep Dive 3 - `src/app/(protected)/estates/[estateId]/valuation/page.tsx`

This is a very educational file because it connects:

- route handling
- session loading
- data fetching
- form reading
- service calls
- revalidation
- redirect behavior

### The import section

The first lines import many helpers and components.

That already tells you the page does several jobs:

- render UI
- talk to auth
- talk to services
- transform form input

### Helper functions at the top

The page defines small helper functions like:

- `readRequiredString`
- `readOptionalString`
- `readOptionalNumber`
- `readBoolean`
- `readStringList`

These exist because raw form data is messy.

Plain-language meaning:

The browser sends form values as general text-like values. These helpers clean them into the correct data types.

Examples:

- `"123.45"` becomes number `123.45`
- empty value becomes `undefined`
- checked checkbox becomes `true`

### Builder functions

Then the file defines functions like:

- `buildHistoricalFinancialAnalysis`
- `buildDiscountedCashFlow`
- `buildMaintainableEarningsMethod`
- `buildNetAssetValueMethod`
- `buildReconciliation`

These functions convert many small form inputs into structured business objects.

This is a professional pattern.

Instead of writing one huge unreadable block, the code breaks the transformation into named sections.

### The page function

Later you see:

```tsx
export default async function EstateValuationPage({ params, searchParams }) {
```

This means:

- this file defines the page
- it is asynchronous because it loads data
- it receives route parameters like `estateId`

### Loading the estate, runs, and session

The page uses `Promise.all(...)` to load multiple things at once:

- estate
- engine runs
- logged-in session

Why do this?

Because loading in parallel is faster than loading one thing after another.

This is a small but professional performance idea.

### `notFound()`

If the estate does not exist, the page calls `notFound()`.

Plain-language meaning:

"Stop and show a proper page-not-found response."

### `approveRunAction`

This function includes:

```tsx
"use server";
```

This line is very important.

It tells Next.js:

"This function must run on the server, not in the browser."

Why?

Because approving a run changes important data.

### `createValuationRunAction`

This function:

- reads submitted form data
- builds structured inputs
- calls `estateValuationService.createValuationRun(...)`
- revalidates related pages
- redirects back to the valuation page

This is one of the clearest examples of full-stack behavior in the app.

### `revalidatePath(...)`

This tells Next.js:

"The cached data for these pages may now be outdated. Refresh them."

That is why other pages like CGT, estate duty, and filing pack can reflect the new valuation.

### `redirect(...)`

This sends the user back to the page after the server action completes.

### JSX return

At the bottom, the page returns layout and components:

- `EstateWorkspaceLayout`
- `EngineReviewPanel`
- `Card`
- `EstateValuationWorkspace`

This is the screen-building part.

### Beginner lesson

This file teaches the difference between:

- input cleaning
- business logic
- UI rendering
- route behavior

A beginner often mixes all of these together. This file shows how to separate them.

---

## Part 9: Deep Dive 4 - `src/modules/estates/service.ts`

This is one of the most important service files in the repo.

It is a business logic file.

### What a service file is

A service file answers questions like:

- what should happen when an estate is created?
- how do we add an asset?
- how do we advance a stage?
- how do we issue executor access?

It is not mainly about drawing screens.
It is about doing work correctly.

### The import section tells the story

This file imports things such as:

- demo/db environment helpers
- Prisma
- audit writer
- client creation
- checklist builders
- liquidation calculator
- estate repository
- validation schemas

This tells you the service coordinates many responsibilities.

### Helper functions

Examples:

- `resolveEstateFirmId`
- `buildEstateReference`
- `buildExecutorAccessToken`
- `getTodayIsoDate`

These helper functions create reusable business behavior.

#### `buildEstateReference`

This function creates estate references like:

`EST-2026-0001`

It looks at the year from the date of death and counts existing references for that year.

That is a good example of business-specific rule logic.

### Service functions

Important functions in this file include:

- `listEstates`
- `getEstateById`
- `getEstateLiquidationSummary`
- `createEstateExecutorAccess`
- `revokeEstateExecutorAccess`
- `getExecutorEstateByAccessToken`
- `createEstate`
- `addEstateAsset`
- `addEstateLiability`
- `addEstateBeneficiary`
- `addEstateLiquidationEntry`
- `addEstateLiquidationDistribution`
- `updateEstateChecklistItemStatus`
- `advanceEstateStage`

### What `createEstate` teaches

`createEstate` does several business actions in sequence:

1. validate the input
2. get the firm id
3. build the estate reference
4. create a linked client
5. create the estate
6. add initial checklist items
7. add the first stage event
8. reload the result
9. write an audit log

This is a classic service-layer pattern.

One user action causes many internal actions.

### What `advanceEstateStage` teaches

This function:

- loads the estate
- validates whether stage advancement is allowed
- throws readable errors if blocked
- updates the stage
- records a stage event
- writes an audit log

This teaches a core professional idea:

business rules should be enforced in the service layer, not only in the screen.

If you enforce rules only in the UI, another code path could bypass them.

### What audit logging teaches

Many functions call `writeAuditLog(...)`.

This means the app records important actions for traceability.

That is especially important in a compliance system.

### Beginner lesson

When you see a service file, ask:

- what business event is this function handling?
- what validation happens first?
- what repository or database call happens next?
- what side effects happen after that?

That is how you start reading backend code professionally.

---

## Part 10: Deep Dive 5 - `prisma/schema.prisma`

This file is the data blueprint for the app.

If the app were a company office, this file would define:

- all the forms
- all the record types
- all the relationships between records

### The first lines

```prisma
generator client {
  provider = "prisma-client-js"
}
```

This tells Prisma to generate JavaScript/TypeScript client code so the app can talk to the database.

### Datasource

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

This says:

- the database is PostgreSQL
- get the connection string from the environment variable `DATABASE_URL`

### Enums

The file has many `enum` definitions.

An enum is a controlled list of allowed values.

Examples:

- `RoleCode`
- `EstateStage`
- `EstateAssetCategory`
- `EstateEngineType`

Plain-language meaning:

Instead of letting random text be stored, the system forces certain fields to use a valid known value.

That reduces data mistakes.

### Models

After enums come `model` blocks.

A model is like a table in the database.

Examples:

- `User`
- `Firm`
- `Client`
- `EstateMatter`
- `EstateAsset`
- `Case`
- `Document`
- `IndividualTaxAssessment`

### Example: `EstateMatter`

This model is a central estate record.

It contains fields such as:

- `estateReference`
- `deceasedName`
- `dateOfDeath`
- `executorName`
- `currentStage`
- `status`

Then it also has relationships:

- `assets`
- `liabilities`
- `beneficiaries`
- `checklistItems`
- `stageEvents`
- `engineRuns`

That means one estate is connected to many other records.

### Example: `EstateAsset`

This model stores estate assets and fields like:

- category
- description
- date-of-death value
- base cost
- valuation date value
- residence flags

That is why CGT and valuation engines can run from estate data.

### Example: `EstateEngineRun`

This is a very modern design choice.

Instead of only storing final outputs, the app stores engine runs with:

- engine type
- status
- review requirement
- input snapshot
- output snapshot
- warnings
- dependency snapshot
- approval metadata

Plain-language meaning:

The app stores not only the result, but also the context around the result.

That is useful for review, audit, and re-generation.

### Example: `Case`

The `Case` model handles general SARS workflow matters:

- who the case belongs to
- the tax type
- the review status
- who created it
- who is assigned
- due dates
- related tasks, comments, documents, and reminders

### Beginner lesson

When reading a schema, do this in order:

1. read the enums
2. find the central models
3. identify one-to-many relationships
4. identify indexes and unique rules

That gives you the mental model of the whole app’s data.

---

## Part 11: Deep Dive 6 - `desktop/main.cjs`

This file is the Electron desktop entry point.

If `src/app` is the web app brain, `desktop/main.cjs` is the desktop shell manager.

### First imports

The file imports:

- Node modules like `fs`, `path`, `child_process`
- Electron objects like `app`, `BrowserWindow`, `ipcMain`
- helper files for browser session, file actions, demo restore, runtime paths, and ports

This tells you the file is coordinating desktop startup.

### Host and port settings

```js
const host = process.env.DESKTOP_NEXT_HOST ?? "127.0.0.1";
const preferredPort = Number.parseInt(process.env.DESKTOP_NEXT_PORT ?? "3400", 10);
```

This means:

- try to use environment variables if given
- otherwise use sensible defaults

### Single instance lock

```js
const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}
```

This means:

"Only allow one main instance of the app."

If a second instance starts, it exits.

That prevents duplicated desktop windows and conflicting runtime behavior.

### Startup log helpers

Functions like:

- `getStartupLogPath`
- `writeStartupLog`

exist so the desktop app can record what happened during startup.

That is important because desktop startup problems are harder to inspect than browser errors.

### Loading and error HTML

The file builds small HTML pages for:

- loading state
- startup error state

That means the desktop app can show something useful before the main app is ready.

### `waitForServer`

This function keeps checking whether the internal server is reachable.

Plain-language meaning:

Electron starts, then waits for the web app inside it to become available.

### `startLocalStandaloneServer`

This is a key function.

It:

- resolves the packaged standalone server path
- picks a free local port
- creates the storage directory
- spawns the server process
- logs output
- waits until the server is ready
- returns the app URL

This explains a major architectural fact:

The desktop app is not a completely separate application. It is an Electron shell that runs the Next.js app inside a desktop wrapper.

### `createWindow`

This creates the Electron browser window.

Settings include:

- width and height
- preload file
- disabled direct node integration
- context isolation
- sandboxing

These are security and runtime settings.

### IPC handlers

At the bottom, you see handlers like:

- `taxops:get-app-meta`
- `taxops:open-file`
- `taxops:print-file`
- `taxops:save-file-as`

Plain-language meaning:

The browser side of the app cannot directly do every desktop action.
So the app sends a message to the Electron main process, and the main process performs the action.

This is called IPC: inter-process communication.

### Beginner lesson

This file teaches:

- process orchestration
- desktop runtime control
- error handling
- logging
- security boundaries between browser and desktop shell

---

## Part 12: Deep Dive 7 - The Filing Pack API Route

File:

`src/app/api/reports/estates/[estateId]/filing-pack/route.ts`

This file is a server endpoint that generates:

- single artifacts
- PDFs
- Word documents
- JSON manifests
- ZIP bundles

### Why this file matters

It is a strong professional example because it combines:

- request parsing
- validation
- output format selection
- PDF generation
- file storage
- audit logging
- HTTP responses

### What the top of the file tells you

The imports include:

- `JSZip`
- `NextResponse`
- `getServerSession`
- `chromium`
- storage helpers
- filing pack service
- report types

That tells you:

- this route is doing server work
- it is generating downloadable content
- it is using Playwright to create PDFs

### Supported render formats

There is a map called:

- `SUPPORTED_ARTIFACT_RENDER_FORMATS`

This is a policy decision.

It tells the system which artifact can be produced as:

- PDF
- DOCX
- JSON

### Helper functions

The route has many helper functions:

- file name builders
- HTML builders
- escape helpers
- table builders
- output format resolution
- report rendering

These exist because the route has many responsibilities and needs to stay organized.

### The `GET` function

The main `GET` function:

1. reads the request URL
2. extracts query values such as `taxYear`, `artifactCode`, `renderFormat`, `bundle`, `download`
3. validates them
4. generates either a single artifact manifest or the full filing pack manifest
5. prepares files
6. writes audit logs
7. returns JSON or downloadable binary content

### Important architectural lesson

The route does not itself decide the business meaning of the filing pack.

That job belongs to:

- `estateFilingPackService`

The route’s job is more like:

- accept request
- ask service for business output
- package that output into files
- return the response

This separation is very important.

### Beginner lesson

When reading an API route, ask:

- what inputs come from the URL?
- what validation happens?
- what service is called?
- what file or JSON response is built?
- what happens if something goes wrong?

That is the standard route-reading method.

---

## Part 13: Deep Dive 8 - Tests

Representative file:

`src/modules/estates/service.test.ts`

### Why tests matter

Tests are executable expectations.

They answer questions like:

- if I create an estate, what should happen?
- if I add an asset, does it show up?
- if I revoke executor access, is access blocked immediately?

### What a test file looks like

You see many `it(...)` blocks.

Example meanings:

- `it("creates a new estate and links it to an estate client", async () => { ... })`
- `it("adds assets, liabilities, and beneficiaries to an estate", async () => { ... })`

Each `it(...)` block is one behavior claim.

### Why cleanup exists

Because the tests mutate demo data, they need cleanup logic so one test does not break another.

That is what the `cleanup(...)` helper is doing.

### Beginner lesson

A strong way to learn code is:

1. read the test name
2. read what data it creates
3. read what function it calls
4. read what it expects

Tests are often easier to understand than the implementation.

---

## Part 14: Folder-by-Folder Guide to the Whole Repo

### Root folder

#### `README.md`

This is the human introduction to the project.

Read this first when joining a repo.

#### `package.json`

Project control file. Already explained above.

#### `tsconfig.json`

This tells TypeScript how to interpret and compile the code.

#### `next.config.ts`

This configures Next.js behavior.

#### `middleware.ts`

This can run before requests and is often used for auth or route control.

#### `.env.local`

Local secret configuration such as:

- database URL
- auth secret
- runtime flags

### `src/app`

This folder is the route system.

Read it when asking:

- what pages exist?
- what URLs exist?
- where does a specific screen come from?

#### `layout.tsx`

Root wrapper around the app.

#### `page.tsx`

Usually the home entry route.

#### `(auth)`

Login or auth-related pages.

#### `(protected)`

The real working app for signed-in users.

Examples include:

- estates
- cases
- clients
- individual tax

#### `api`

Server endpoints.

This is where downloadable reports and similar machine-style endpoints live.

#### `executor`

Read-only executor-facing routes.

#### `reports`

Routes that show printable report views.

### `src/components`

This folder is the UI toolbox.

#### `ui`

Very reusable low-level components such as:

- cards
- badges
- tables
- buttons

#### `estates`

Estate-specific UI pieces such as:

- dashboards
- trackers
- workspaces
- report action controls

#### `reports`

Components that visually present report output.

Plain-language meaning:

These are the "printable view" or "report display" pieces.

### `src/modules`

This is the most important business folder.

Think of each subfolder as a department of the software company.

#### `audit`

Tracks important actions for accountability.

#### `cases`

Handles workflow cases.

#### `clients`

Handles clients and client creation.

#### `dashboard`

Logic for summary views.

#### `deadlines`

Time-based work and reminders.

#### `documents`

Stores document metadata and file-storage behavior.

#### `estates`

One of the richest modules.

Contains:

- estate services
- repositories
- validation
- liquidation logic
- engine logic
- filing-pack logic
- year-pack logic

#### `individual-tax`

Contains the individual tax engine, rules, and report logic.

#### `itr12`

Contains the ITR12 workflow-specific pieces.

#### `knowledge-base`

Contains knowledge article logic.

#### `shared`

Contains shared domain logic used across modules.

### `src/lib`

This contains app infrastructure.

Examples:

- auth options
- database connection
- environment variable loading
- reusable utility functions

### `src/server`

This contains server-side demo support.

If the app is in demo mode, this layer provides the sample operating data.

### `src/types`

This contains global types that multiple parts of the app need.

### `desktop`

This folder contains the Electron side of the app.

Important files include:

- `main.cjs`
- `preload.cjs`
- `file-actions.cjs`
- `prepare-standalone.cjs`
- `runtime-paths.cjs`
- `golden-demo-restore.cjs`

#### `preload.cjs`

This safely exposes desktop capabilities to the browser UI.

#### `file-actions.cjs`

This handles things like:

- open file
- print file
- save file as

#### `prepare-standalone.cjs`

This prepares the standalone runtime used by the desktop app.

### `prisma`

Important files include:

- `schema.prisma`
- `seed.ts`

`schema.prisma` defines the database.

`seed.ts` inserts sample data.

### `docs`

Contains design records, plans, and supporting documents.

This is where the team explains why changes were made.

### `tests`

Contains higher-level or cross-cutting tests outside the main source folders.

---

## Part 15: How to Read Code Without Getting Lost

When you open a new file, do not start by reading every character.

Use this order:

### Step 1: Read the file name

Ask:

- is this a page?
- a service?
- a test?
- a schema?
- a component?

### Step 2: Read the imports

Imports tell you what the file depends on.

### Step 3: Find the main export

Look for:

- `export default function ...`
- `export function ...`
- `export const ...`

That tells you what the file is mainly providing.

### Step 4: Identify helper functions

These are usually the preparation tools used by the main logic.

### Step 5: Find side effects

Side effects are actions like:

- database writes
- audit logging
- file generation
- redirects
- printing

### Step 6: Find the return value

For a page or component, this is the UI.

For a service, this is the business result.

For a route, this is the HTTP response.

---

## Part 16: The Most Important Beginner Concepts Hidden in This App

### 1. Functions

A function is a named set of instructions.

Examples in this app:

- create an estate
- build a report
- calculate liquidation summary
- generate a PDF

### 2. Parameters

Parameters are the inputs a function receives.

Example:

- estate id
- tax year
- form data

### 3. Return values

A function often gives something back.

Examples:

- an estate record
- a report manifest
- a PDF response

### 4. Types

Types describe what shape data should have.

TypeScript uses this heavily so the code is safer and easier to reason about.

### 5. Validation

Validation checks whether input is acceptable.

This app uses validation heavily because tax and estate work is high-trust and error-sensitive.

### 6. State

State means the current stored condition of the system.

Examples:

- current estate stage
- whether a run is approved
- whether a checklist item is complete

### 7. Composition

Composition means building bigger things from smaller reusable parts.

The UI is heavily composed from components.

### 8. Separation of concerns

This is one of the most important professional ideas.

It means:

- pages handle routing and page assembly
- components handle presentation
- services handle business rules
- repositories handle data access
- schemas handle data shape

---

## Part 17: How Professional Developers Think About Structure

A professional developer does not only ask:

"Does it work?"

They also ask:

- Is the code readable?
- Is the logic in the right layer?
- Can this be tested?
- Will another developer understand this six months from now?
- Is the business rule enforced in the backend, not only the UI?
- If this breaks in production, will we know why?

This repo shows many good professional habits:

- validation functions
- service layers
- audit logging
- test coverage
- route revalidation
- desktop/browser separation
- domain-driven folder structure

---

## Part 18: Practice Exercises Using This App

Do these in order.

### Exercise 1: Learn the route map

Open `src/app` and answer:

- where is the estate valuation page?
- where is the filing-pack API route?
- where is the login route?

### Exercise 2: Learn component assembly

Open the valuation page and identify:

- which layout component it uses
- which main workspace component it renders
- which review component it renders

### Exercise 3: Learn service flow

Open `src/modules/estates/service.ts` and trace:

- where estate creation starts
- where validation happens
- where audit logging happens

### Exercise 4: Learn the schema

Open `prisma/schema.prisma` and list:

- five enums
- five models
- three relationships connected to `EstateMatter`

### Exercise 5: Learn desktop flow

Open `desktop/main.cjs` and answer:

- where the app window is created
- where the standalone server starts
- where open/print/save desktop actions are exposed

### Exercise 6: Learn tests

Open `src/modules/estates/service.test.ts` and read only test names first.

Then answer:

- what behaviors does the team care about most?

This is a very strong way to learn a codebase quickly.

---

## Part 19: A Beginner’s Roadmap From Zero to Professional

### Stage 1: Learn to read

Goal:

- understand what a file is doing
- identify imports, functions, inputs, outputs

Do not try to build new features yet.

### Stage 2: Make tiny changes

Goal:

- change text
- rename labels
- add a small field
- run tests

### Stage 3: Understand data flow

Goal:

- trace a user action from screen to service to storage

### Stage 4: Write one feature

Goal:

- add a small improvement with tests

### Stage 5: Think in architecture

Goal:

- decide which layer should own the logic

### Stage 6: Think professionally

Goal:

- write code for future maintainers
- validate inputs
- log important changes
- keep tests green

---

## Part 20: Coding Glossary in Plain Language

### App Router

A Next.js system where folders and files define the pages and routes of the app.

### API Route

A server endpoint that returns data or files instead of a visual page.

### Async

Code that can wait for slower work such as database or network activity.

### Component

A reusable UI building block.

### Dependency

Something a file needs in order to work, often imported from another file or library.

### Enum

A fixed list of allowed values.

### Function

A named set of instructions.

### IPC

Inter-process communication. In this app, it lets the browser UI ask Electron to do desktop actions.

### Layout

A wrapper that surrounds multiple pages with shared structure.

### Model

A database record type such as `User` or `EstateMatter`.

### Prisma

The tool used to define and access the database.

### React

The UI library used to build components and pages.

### Revalidate

Tell Next.js to refresh cached data after something changes.

### Repository

A code layer that reads and writes data.

### Schema

A formal definition of data structure.

### Service

A code layer that handles business rules and workflows.

### TypeScript

A typed version of JavaScript that helps catch errors earlier.

---

## Part 21: Final Advice for Learning This Codebase

Do not try to learn everything at once.

Use this sequence:

1. `README.md`
2. `package.json`
3. `src/app/layout.tsx`
4. one route page
5. one component
6. one service file
7. `prisma/schema.prisma`
8. one test file
9. `desktop/main.cjs`

If you can explain those clearly, you already understand the architecture of the app at a serious level.

### The key mindset shift

Beginners often think coding means memorizing syntax.

Professional developers know the real skill is:

- understanding systems
- breaking problems into layers
- moving data safely
- naming things clearly
- testing important behavior

This app is a strong learning example because it is not a toy. It includes:

- real routing
- real business logic
- structured data
- report generation
- desktop packaging
- testing

That means if you learn to read this app properly, you are learning real software engineering, not only tutorial code.

---

## Suggested Next Practical Study Session

If you continue after reading this guide, the best next session is:

1. open `src/app/(protected)/estates/[estateId]/valuation/page.tsx`
2. read it slowly
3. mark every helper function
4. identify where UI ends and service logic begins
5. open `src/modules/estates/service.ts`
6. trace one business action end to end
7. open the related test file
8. explain it back in your own words

If you can do that, you are already moving from beginner toward intermediate level.
