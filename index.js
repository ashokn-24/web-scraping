const cheerio = require("cheerio");
const fs = require("fs/promises");
const path = require("path");
const jobZone = require("./job_zones.json");
const { v4: uuidv4 } = require("uuid");

// console.log(zones);

const getHtml = async (url) => {
  try {
    const res = await fetch(url);
    return res.text();
  } catch (error) {
    console.log(error);
  }
};

const processPage = async (url) => {
  const html = await getHtml(url);
  if (!html) return;

  const $ = cheerio.load(html);

  const z = $("#z option[selected]");
  const zoneId = $(z).attr("value");
  const zoneDescription = $(z).text().split(":")[1].trim();

  const rows = $("tbody tr");

  const zone = {
    zone: zoneId,
    description: zoneDescription,
    occupations: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const code = $(row).find('td[data-title="Code"]').text().trim();
    const title = $(row).find('td[data-title="Occupation"]').text().trim();
    const job_links = $(row).find("a").attr("href");

    let reportedJobTitles = [];

    if (job_links) {
      const jobLink = new URL(job_links, url).href;
      const jobHtml = await getHtml(jobLink);
      const $job = cheerio.load(jobHtml);

      const jobCode = $job(".sub")
        .children("div")
        .find("div > div:first")
        .text()
        .trim();

      // Extracting Data
      const getJobData = (selector) => {
        const wa = $job(`#${selector}`).find("ul");
        const work = wa.find("li").get();
        const data = [];
        const taskMap = new Map();

        work.forEach((w, i) => {
          const text = $(w).find("div > div:first").text();

          if (taskMap.has(text)) {
            // Update relation if task already exists
            const existingTaskIndex = taskMap.get(text);
            const existingTask = data[existingTaskIndex];
            if (!existingTask.relation.includes(jobCode)) {
              existingTask.relation.push(jobCode);
            }
          } else {
            // Add new task
            const newTask = {
              id: uuidv4(),
              [selector]: text,
              relation: [jobCode],
            };
            data.push(newTask);
            taskMap.set(text, data.length - 1);
          }

          console.log(data);
        });

        // Update each task with the count of job codes
        data.forEach((task) => {
          task.relationCount = task.relation.length;
        });

        return data;
      };

      getJobData("Tasks");

      //Extracting Data
      // const getJobData = (selector) => {
      //   const wa = $job(`#${selector}`).find("ul");
      //   const work = wa.find("li").get();
      //   const data = [];

      //   work.forEach((w, i) => {
      //     const text = $(w).find("div > div:first").text();
      //     data.push({
      //       id: uuidv4(),
      //       [selector]: text,
      //     });

      //     console.log(data);
      //   });
      //   return data;
      // };

      // getJobData("Tasks");

      const titlesText = $job("div[id='content']")
        .children("p:nth-of-type(2)")
        .contents("b")
        .text();
      reportedJobTitles = titlesText.split(":").map((title) => title.trim());
      reportedJobTitles.shift(); // Remove first element if needed
      reportedJobTitles = [...new Set(reportedJobTitles)]; // Remove duplicates
    }

    for (let i = 0; i < jobZone.length; i++) {
      zone.occupations.push({
        zonId: [jobZone[i].id],
        code: code,
        title: title,
        reportedJobTitles: reportedJobTitles,
      });
    }
  }

  return zone;
};

(async () => {
  const zones = ["one", "two", "three"];
  // for (let i = 0; i < jobZone.length; i++) {
  //   let zones = await jobZone[i].zone;
  // }

  try {
    await createDir(path.join(__dirname, "data"));
    await createDir(path.join(__dirname, "jobInfo"));

    for (let i = 0; i < zones.length; i++) {
      const startTime = Date.now();
      const data = await processPage(
        `https://www.onetonline.org/find/zone?z=${i + 1}`
      );
      const endTime = Date.now();

      const filePath = path.join(__dirname, "data", `zone-${zones[i]}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), {
        encoding: "utf-8",
      });

      console.log(
        `Completed Zone ${zones[i]} in ${(endTime - startTime) / 1000}s`
      );
    }

    console.log("Writing JSON to file");
  } catch (err) {
    console.log("Error while scrapping", err);
  }
})();

async function createDir(path) {
  try {
    await fs.stat(path);
    return;
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.mkdir(path);
    }
  }
}
