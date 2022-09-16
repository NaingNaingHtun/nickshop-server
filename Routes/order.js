const router = require("express").Router();
const Order = require("../Models/Order");
const { verifyToken, verifyAdmin } = require("./userVerification");
const monthsNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

//changing 23.23999 into 23.23
const truncate = (total) => {
  const splited = (total + "").split(".");
  let beforeDot = "";
  let afterDot = "";

  if (splited.length > 1) {
    beforeDot = splited[0]; //"100"
    afterDot = splited[1]; //"3300000003"
    total = Number(beforeDot + "." + afterDot.slice(0, 2));
  } else {
    beforeDot = splited[0]; //"100"
    total = Number(beforeDot + "." + afterDot);
  }

  return total;
};

//===============ROUTES HANDLING============
//create a order
router.post("/", verifyToken, async (req, res) => {
  try {
    //make a new order
    const newOrder = new Order(req.body);
    //save the order
    const savedOrder = await newOrder.save();
    res.status(200).json(savedOrder);
  } catch (error) {
    res.status(500).json(error);
  }
});

//update order
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.body.orderId,
      {
        $set: req.body,
      },
      { new: true }
    );
    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json(error);
  }
});

//get orders of the user
router.get("/find/:userId", verifyToken, verifyAdmin, async (req, res) => {
  //id = is userId
  //only admin can get the orders of the user
  try {
    const lastestOrders = await Order.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(10); //get all the lastestOrders of the user
    res.status(200).json(lastestOrders);
  } catch (error) {
    res.status(500).json(error);
  }
});

//delete order
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  //only admin can delete the order
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).json("Order has been deleted");
  } catch (error) {
    res.status(500).json(error);
  }
});

//get all the orders
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
  //only admin can get all the orders

  try {
    const orders = await Order.find();
    //send the products
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json(error);
  }
});

//get monthly incomes
router.get(
  "/prev_six_months_incomes",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const date = new Date();
    const currentMonth = date.getMonth(); //0 for january
    const lastYear = new Date(date.setFullYear(date.getFullYear() - 1));
    let six_months_names = [];
    let six_months_incomes = [];

    //creating previous 6 months names
    for (let i = 1; i <= 6; i++) {
      six_months_names.push(monthsNames[currentMonth - i]);
    }
    six_months_names = six_months_names.reverse(); //the getting array is in reverse order, so we need to reverse them again

    try {
      const income = await Order.aggregate([
        {
          $match: { createdAt: { $gt: lastYear } },
        },
        {
          $project: {
            month: { $month: "$createdAt" },
            sales: "$total",
          },
        },
        {
          $group: {
            _id: "$month",
            total: { $sum: "$sales" },
            orders: { $sum: 1 },
          },
        },
      ]);

      const getAmount = (m) => {
        m = "0" + m;
        const result = 0;
        income.forEach((month_income) => {
          if (month_income._id === m) {
            result = month_income.total;
          }
        });

        return result;
      };

      //making six months incomes for the linechart
      six_months_names.forEach((m) => {
        six_months_incomes.push({
          name: m,
          amount: truncate(getAmount(monthsNames.indexOf(m))),
        });
      });

      res.status(200).json(six_months_incomes);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

router.get("/prev_month_incomes", async (req, res) => {
  const result = [];
  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const currentMonth = new Date(`${month}/1/${year}`);
  const lastMonth = new Date(`${month - 1}/1/${year}`);
  let income = [];
  try {
    income = await Order.aggregate([
      {
        $match: { createdAt: { $gte: lastMonth, $lt: currentMonth } },
      },
      {
        $project: {
          day: { $dayOfMonth: "$createdAt" },
          sales: "$total",
        },
      },
      {
        $group: {
          _id: "$day",
          total: { $sum: "$sales" },
          orders: { $sum: 1 },
        },
      },
    ]);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }

  const days_30_months = ["April", "June", "September", "November"];
  const days_28_months = ["February"];
  const days = []; // days of a month, may be 28, 30, 31
  const daily_incomes = []; //[100, 200, 300, 400, 500, 1000, 10000,....]

  if (days_30_months.includes(monthsNames[lastMonth.getMonth()])) {
    //if 30 days month
    days.length = 30;
  } else if (days_28_months.includes(monthsNames[lastMonth.getMonth()])) {
    //if 28 days month
    days.length = 28;
  } else {
    //if 31 days month
    days.length = 31;
  }

  //filling the days with 0 so that can use iteration because setting length to an array will give back an array with elements that are empty
  days.fill(1);

  //populating the daily_incomes => [200, 100, 300,330, 340,...]
  if (income.length === 0) {
    //no incomes, then fill the daily_incomes array with 0
    days.fill(0);
  } else {
    for (let i = 0; i < days.length; i++) {
      daily_incomes[i] = 0; //initialize with 0 income
      for (let j = 0; j < income.length; j++) {
        if (income[j]._id === i + 1) {
          daily_incomes[i] = income[j].total;
          break; //if we found one income then stop the loop
        }
      }
    }
  }

  //line chart titles making stages
  let lastTitle = "";
  if (days_30_months.includes(monthsNames[lastMonth.getMonth()])) {
    //if 30 days month
    lastTitle = "24-30";
  } else if (days_28_months.includes(monthsNames[lastMonth.getMonth()])) {
    //if 28 days month
    lastTitle = "24-8";
  } else {
    //if 31 days month
    lastTitle = "24-31";
  }
  const line_chart_titles = ["1-7", "8-15", "16-23", lastTitle];
  const line_chart_data = [];
  line_chart_titles.forEach((line_chart_title, index) => {
    const startIndex = index * 7;
    let endIndex = startIndex + 7;
    if (line_chart_titles.length === index) {
      //if it is the last week, it should include till the end of the month
      endIndex = line_chart_titles.length;
    }
    let seven_days_total = 0;
    const seven_days_incomes = daily_incomes.slice(startIndex, endIndex);
    seven_days_total = seven_days_incomes.reduce(
      (previous, current) => previous + current,
      0
    );

    line_chart_data.push({
      name: line_chart_title,
      amount: seven_days_total,
    });
  });

  // console.log(line_chart_data);
  res.status(200).json(line_chart_data);
});

//today orders
router.get("/orders_by_date/:date", async (req, res) => {
  // console.log("date: ", req.params.date);
  // console.log("req: ", req);

  if (!req.params.date) {
    return null;
  }
  const date = new Date(req.params.date);
  const filterDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    1,
    0,
    0
  );
  const filterDateTomorrow = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    1,
    0,
    0
  );
  console.log(filterDate.toDateString(), filterDateTomorrow.toDateString());
  try {
    const orders = await Order.find({
      createdAt: {
        $gte: filterDate,
        $lt: filterDateTomorrow,
      },
    });
    // console.log("orders", orders);
    res.status(200).json(orders);
    // res.status(200).json([]);
  } catch (error) {
    console.log(error);
    res.status(500).json("error");
  }
});

router.get("/prev-six_months_spendings/:userId", async (req, res) => {
  const { userId } = req.params;
  const date = new Date();
  const currentMonth = date.getMonth(); //0 for january
  const lastYear = new Date(date.setFullYear(date.getFullYear() - 1));
  let six_months_names = [];
  let six_month_spendings = [];

  //creating previous 6 months names
  for (let i = 1; i <= 6; i++) {
    six_months_names.push(monthsNames[currentMonth - i]);
  }
  six_months_names = six_months_names.reverse(); //the getting array is in reverse order, so we need to reverse them again

  //assume current year is 2022, so the last year will be 2021,
  //so > 2021 is also 2022
  //the reason i chose > 2021 is that becuase > 2021 is the start of the 2022 and we want all the orders start from the 2022
  const monthlySpendings = await Order.aggregate([
    {
      $match: { userId, createdAt: { $gt: lastYear } },
    },
    {
      $project: {
        month: { $month: "$createdAt" },
        total: "$total",
      },
    },
    {
      $group: {
        _id: "$month",
        total: { $sum: "$total" },
      },
    },
  ]);

  //from the previous stage of finding monthlySpendings, we will get like this [{"09": }]
  const getAmount = (m) => {
    m = "0" + m;
    const amount = 0;
    monthlySpendings.forEach((month_spending) => {
      if (month_spending._id === m) {
        amount = month_spending.total;
      }
    });

    return amount;
  };

  //making six months incomes for the linechart
  six_months_names.forEach((m) => {
    six_month_spendings.push({
      name: m,
      total: truncate(getAmount(monthsNames.indexOf(m))),
    });
  });

  res.status(200).json(six_month_spendings);
});

//get previous six months spendings by category of a user
router.get(
  "/prev_six_months_spendings_by_category/:userId",
  async (req, res) => {
    const { userId } = req.params;
    const date = new Date();
    const currentMonth = date.getMonth(); //0 for january
    const lastYear = new Date(date.setFullYear(date.getFullYear() - 1)); //reduce 1 year from the current year
    let six_months_names = []; //initialize six months names
    let six_months_spendings = []; //initialize six months spendsings
    const categories = ["hat", "glasses", "coat", "shirt", "pant", "shoe"]; //we need to make totals of these categories

    //creating previous 6 months names based on the current month
    for (let i = 1; i <= 6; i++) {
      six_months_names.push(monthsNames[currentMonth - i]);
    }

    six_months_names = six_months_names.reverse(); //the getting array is in reverse order, so we need to reverse them again

    //find the orders of the this year
    const presentYearOrders = await Order.find({
      userId,
      createdAt: { $gt: lastYear },
    });

    const ordersTotalByMonth = []; //12 months total start from 0 and update them later
    ordersTotalByMonth.length = 12;
    ordersTotalByMonth.fill([0, 0, 0, 0, 0, 0]); //initial 12 months total

    //finding the total by category of an order of a month
    presentYearOrders.forEach((order) => {
      const date = new Date(order.createdAt); // i am going to use the month of the date as an index
      const totalByCategory = [0, 0, 0, 0, 0, 0]; //start from "hat" and end with "shoe"

      order.products.forEach((product) => {
        //loop all through the products of an order and make a total by category and
        product.category.forEach((category) => {
          //add the totals of the order to the totals by month
          if (categories.includes(category)) {
            const index = categories.indexOf(category);
            totalByCategory[index] += product.total;
          }
        });
      });

      //update the total by category of a month
      const updatedTotalByCategory = [0, 0, 0, 0, 0, 0];
      ordersTotalByMonth[date.getMonth()].forEach((total, index) => {
        updatedTotalByCategory[index] = totalByCategory[index] + total;
      });
      //update the total by category of a month
      ordersTotalByMonth[date.getMonth()] = updatedTotalByCategory;
    });

    categories.forEach((category, category_index) => {
      let totalByCategory = 0;
      six_months_names.forEach((month_name) => {
        const index = monthsNames.indexOf(month_name);
        totalByCategory += ordersTotalByMonth[index][category_index];
      });
      six_months_spendings.push({
        name: category,
        total: truncate(totalByCategory),
      });
    });

    res.status(200).json(six_months_spendings);
  }
);

//best sellings products
router.get("/best-sellings-products", async (req, res) => {
  //if we don't have 3 best sellings products for a month, then we need to find the another month
  let productsTotal = {};

  let y = 0;
  let sortedProductsTotal = [];
  const orders = await Order.find({}).sort({ createdAt: 1 }); //find and sort the order from the oldest to the newest orders
  const oldestOrder = orders[0]; //so why do i make a oldest order. It is bacasue we need to stop the while loop if it is the last order
  const oldestOrderDate = new Date(oldestOrder.createdAt);
  const date = new Date();
  while (sortedProductsTotal.length < 3 && date >= oldestOrderDate) {
    //check if the order is the last order
    productsTotal = {}; //if the current month doesn't have the top 3 best sellings products, then we are going to find them in the previous months and so on...

    if (y > 11) {
      //a year have only 12 months
      y = 0;
    }

    date.setMonth(date.getMonth() - y); //reduce one month
    const currentMonth = new Date(new Date(date).setDate(1));
    const nextMonth = new Date(
      new Date(currentMonth).setMonth(currentMonth.getMonth() + 1)
    ); //increase one month

    const thisMonthOrders = await Order.find({
      createdAt: {
        $gte: currentMonth,
        $lt: nextMonth,
      },
    });

    //make totals of unique products
    thisMonthOrders.forEach((order) => {
      order.products.forEach(({ _id, total, image }) => {
        if (Object.keys(productsTotal).includes(_id)) {
          productsTotal[_id].total += total;
        } else {
          productsTotal[_id] = { total, id: _id, image };
        }
      });
    });
    //sort the products
    sortedProductsTotal = Object.entries(productsTotal).sort(
      (a, b) => b[1].total - a[1].total
    );
    y++; //increase the month reducer
  }
  //getting only the top 3 products
  sortedProductsTotal.length = 3;
  //populate the best products as an id as an a key and the orders as the properties
  const bestSellings = sortedProductsTotal.map((productArr) => ({
    id: productArr[0],
    ...productArr[1],
  }));
  res.status(200).json(bestSellings);
});
module.exports = router;
