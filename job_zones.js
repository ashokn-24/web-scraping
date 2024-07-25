const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const data = [
  {
    id: uuidv4(),
    description: "Little or No Preparation Needed",
    zone: "one",
  },
  {
    id: uuidv4(),
    description: "Medium Preparation Needed",
    zone: "two",
  },
  {
    id: uuidv4(),
    description: "Some Preparation Needed",
    zone: "three",
  },
];

fs.writeFileSync("job_zones.json", JSON.stringify(data, null, 2));
