const express = require("express");
const app = express();

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
app.use(express.json());

var isValid = require("date-fns/isValid");

let db = null;
let dbPath = path.join(__dirname, "todoApplication.db");

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running...");
    });
  } catch (e) {
    console.log(`DB ERROR : ${e.message}`);
  }
};

initializeDbAndServer();

const convertDbTodoToResponse = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

const checkValidPriority = (priority) => {
  if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
    return true;
  } else {
    return false;
  }
};

const checkValidStatus = (status) => {
  if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
    return true;
  } else {
    return false;
  }
};

const checkValidCategory = (category) => {
  if (category === "WORK" || category === "HOME" || category === "LEARNING") {
    return true;
  } else {
    return false;
  }
};

// API - 1 Get Todo
app.get("/todos/", async (request, response) => {
  const { status, priority, search_q, category } = request.query;
  let getQuery = "";
  let noErrors = false;

  switch (true) {
    // SCENARIO - 3
    case priority !== undefined && status !== undefined:
      if (checkValidPriority(priority) === false) {
        response.status(400);
        response.send("Invalid Todo Priority");
        break;
      } else if (checkValidStatus(status) === false) {
        response.status(400);
        response.send("Invalid Todo Status");
        break;
      } else {
        getQuery = `
                SELECT * 
                FROM todo
                WHERE priority = '${priority}' 
                AND status = '${status}';`;
        noErrors = true;
        break;
      }

    // SCENARIO - 5
    case category !== undefined && status !== undefined:
      if (checkValidCategory(category) === false) {
        response.status(400);
        response.send("Invalid Todo Category");
        break;
      } else if (checkValidStatus(status) === false) {
        response.status(400);
        response.send("Invalid Todo Status");
        break;
      } else {
        getQuery = `
            SELECT * 
            FROM todo
            WHERE category = '${category}'
            AND status = '${status}'; `;
        noErrors = true;
        break;
      }

    // SCENARIO - 7
    case category !== undefined && priority !== undefined:
      if (checkValidCategory(category) === false) {
        response.status(400);
        response.send("Invalid Todo Category");
        break;
      } else if (checkValidPriority(priority) === false) {
        response.status(400);
        response.send("Invalid Todo Priority");
        break;
      } else {
        getQuery = `
            SELECT * 
            FROM todo
            WHERE category = '${category}'
            AND priority = '${priority}'; `;
        noErrors = true;
        break;
      }

    // SCENARIO - 1
    case status !== undefined:
      if (checkValidStatus(status) === false) {
        response.status(400);
        response.send("Invalid Todo Status");
        break;
      } else {
        getQuery = `
            SELECT * 
            FROM todo
            WHERE status = '${status}';`;
        noErrors = true;
        break;
      }

    // SCENARIO - 2
    case priority !== undefined:
      if (checkValidPriority(priority) === false) {
        response.status(400);
        response.send("Invalid Todo Priority");
        break;
      } else {
        getQuery = `
            SELECT * 
            FROM todo
            WHERE priority = '${priority}';`;
        noErrors = true;
        break;
      }

    // SCENARIO - 4
    case search_q !== undefined:
      getQuery = `
            SELECT * 
            FROM todo
            WHERE todo LIKE '%${search_q}%';`;
      noErrors = true;
      break;

    // SCENARIO - 6
    case category !== undefined:
      if (checkValidCategory(category) === false) {
        response.status(400);
        response.send("Invalid Todo Category");
        break;
      } else {
        getQuery = `
            SELECT * 
            FROM todo
            WHERE category = '${category}';`;
        noErrors = true;
        break;
      }
  }

  if (noErrors) {
    let todosList = await db.all(getQuery);
    response.send(
      todosList.map((eachItem) => convertDbTodoToResponse(eachItem))
    );
  }
});

// API 2 - Get todo by todoId
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getQuery = `
    SELECT * 
    FROM todo
    WHERE id = ${todoId};`;
  let todoItem = await db.get(getQuery);
  response.send(convertDbTodoToResponse(todoItem));
});

// Checking date format
const checkValidDate = (date) => {
  return isValid(new Date(date));
};

// API 3 - Get todo based on date query parameter
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  const getQuery = `
    SELECT * 
    FROM todo
    WHERE due_date = '${date}';`;

  if (checkValidDate(date)) {
    console.log(checkValidDate(date));
    const todosList = await db.all(getQuery);
    response.send(
      todosList.map((eachItem) => convertDbTodoToResponse(eachItem))
    );
  } else {
    console.log(checkValidDate(date));
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// API 4 - Create new todo
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const createQuery = `
  INSERT INTO 
  todo (id, todo, priority, status, category, due_date) 
  VALUES 
    (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');
  `;

  if (checkValidStatus(status) === false) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (checkValidPriority(priority) === false) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (checkValidCategory(category) === false) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (checkValidDate(dueDate) === false) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    await db.run(createQuery);
    response.send("Todo Successfully Added");
  }
});

// API 5 - Update todo based on scenarios
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;

  let updateQuery = "";
  let updateColumn = "";
  let noErrors = false;

  switch (true) {
    case status !== undefined:
      if (checkValidStatus(status) === false) {
        response.status(400);
        response.send("Invalid Todo Status");
        break;
      } else {
        updateQuery = `
          UPDATE todo 
            SET status = '${status}' 
          WHERE id = ${todoId};
          `;
        updateColumn = "Status";
        noErrors = true;
        break;
      }

    case priority !== undefined:
      if (checkValidPriority(priority) === false) {
        response.status(400);
        response.send("Invalid Todo Priority");
        break;
      } else {
        updateQuery = `
          UPDATE todo 
            SET priority = '${priority}' 
          WHERE id = ${todoId};
          `;
        updateColumn = "Priority";
        noErrors = true;
        break;
      }

    case todo !== undefined:
      updateQuery = `
          UPDATE todo 
            SET todo = '${todo}' 
          WHERE id = ${todoId};
          `;
      updateColumn = "Todo";
      noErrors = true;
      break;

    case category !== undefined:
      if (checkValidCategory(category) === false) {
        response.status(400);
        response.send("Invalid Todo Category");
        break;
      } else {
        updateQuery = `
          UPDATE todo 
            SET category = '${category}' 
          WHERE id = ${todoId};
          `;
        updateColumn = "Category";
        noErrors = true;
        break;
      }

    case dueDate !== undefined:
      if (checkValidDate(dueDate) === false) {
        response.status(400);
        response.send("Invalid Due Date");
        break;
      } else {
        updateQuery = `
          UPDATE todo 
            SET due_date = '${dueDate}' 
          WHERE id = ${todoId};
          `;
        updateColumn = "Due Date";
        noErrors = true;
        break;
      }
  }

  if (noErrors) {
    await db.run(updateQuery);
    response.send(`${updateColumn} Updated`);
  }
});

// API 6 - Delete Todo
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};`;

  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

//test api
app.get("/alltodos/", async (request, response) => {
  const getQuery = `
    SELECT *
    FROM todo;`;

  let todos = await db.all(getQuery);
  response.send(todos);
});

module.exports = app;
