# **App Name**: TestWave

## Core Features:

- JSON Upload: Load test cases from a local .json file into the application.
- Test Case Table: Display the loaded test cases in an editable table with columns for process, test case ID, description, test data, steps, expected result, evidence (link), comments, and status.
- Editable Fields: Enable in-table editing for all fields, especially the 'status' field, with a dropdown of 'Passed', 'Failed', and 'N/A'.
- Filtering: Filter test cases by 'process' and 'status' using dropdown menus.
- Evidence Attachment: Attach or link evidence files (screenshots, videos) to each test case, including previewing images inline.
- Basic Statistics: Generate and display simple charts (pie or bar) summarizing test case status: total, passed, failed, N/A.
- Failed Test Report: Generate a formatted report of failed test cases, compiling the test case name, description, data, steps, expected result, comments, and attached evidence. The tool may incorporate extra comments to explain how the failure impacts other components in the system under test. Export this report to PDF.

## Style Guidelines:

- Primary color: Muted purple (#A085CF) for a professional and calm feel.
- Background color: Light gray (#F0F0F5) to ensure readability and a clean interface.
- Accent color: Soft teal (#74b49b) to highlight key actions and elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif font providing a modern, machined, objective, neutral feel for readability and clean presentation.
- Code font: 'Source Code Pro' for displaying JSON data or code snippets.
- Use a set of consistent, simple icons from a library like FontAwesome or Material Icons to represent actions and status indicators.
- Responsive dashboard layout with clear sections for test case management, filtering, and reporting, ensuring usability on various screen sizes.