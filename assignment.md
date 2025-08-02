### Backend Development

#### Overview

This challenge will test the following skills:

- NodeJS environment (Node LTS)
- Typescript proficiency
- Relational databases
- REST APIs
- Validation
- Code Documentation
- Automated Testing

Do not be discouraged if you are unable to complete aspects of the challenge, it is designed to test all levels of ability

#### Rules

- Complete the challenge(s) on your own 
- Referencing of online resources and use of tools is expected
- All code, markup, and assets should be pushed to the provided repository
- You are encouraged to ask us questions at any point
- Note any deviations from the specification
- You may use any supporting library you deem appropriate

#### Instructions

1. Set up a NodeJS Typescript project
2. Create a relational database with a schema for the following data structure:

- A PC (root node) is built from a tree of nodes. Each node has a name. The path of a node can be inferred from the name hierarchy (e.g. _'/root/parent/child'_).
- Each node can have any number of properties. A property is a key value pair, where the key is a string and the value is a decimal number.

3. Develop a way of interacting with this database in the NodeJS project. You may use an ORM of your own choice
4. Seed the database with the following structure (entries with values are properties, others are nodes):

- AlphaPC
  - Height: 450.00
  - Width: 180.00
  - Processing
    - CPU
      - Cores: 4
      - Power: 2.41
    - Graphics
      - RAM: 4000.00
      - Ports: 8.00
    - RAM: 32000.00
  - Storage
    - SSD
      - Capacity: 1024.00
      - WriteSpeed: 250.00
    - HDD
      - Capacity: 5120.00
      - WriteSpeed: 1.724752

5. Expose HTTP endpoints for the following operations:

    1. Create a node with a specified parent
    2. Add a new property on a specific existing node
    3. Return the subtree of nodes with their properties for a provided node path

6. Create unit tests for endpoint **3** above.

7. Create a readme guide on how to run the project, interact with the API and perform the tests.
