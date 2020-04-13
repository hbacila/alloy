const env = process.env.EDGE_ENV || "int";

const pageName = {
  int: "alloyTestPage.html",
  prod: "latestAlloyTestPage.html"
};

export default `https://alloyio.com/functional-test/${pageName[env]}`;
