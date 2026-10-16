import pool from "../config/db.js";


export const getMeals = async (req, res, next) => {
  try {
    //Execute the query using await
    const [rows] = await pool.execute(
      `SELECT M.id, M.name AS meal_name, M.price, M.category_id, C.name AS category_name, M.is_available, M.description, M.image_url
            FROM meals M 
            JOIN categories C ON M.category_id = C.id
            ORDER BY C.name ASC, M.name ASC;`,
    ); //[rows] means index 0 which is the actual array of records

    //Send the data back as JSON
    res.status(200).json(rows);
  } catch (error) {
    //Pass any database error down to centralized errorHandler
    next(error);
  }
};

export const getMeal = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.query(
      `SELECT M.id, M.name AS meal_name, M.price, C.name AS category_name, M.description, M.image_url
             FROM meals M
             JOIN categories C ON M.category_id = C.id
             WHERE M.id = ?`,
      [id],
    );
    if (rows.length === 0) {
      const error = new Error(`Meal with id ${id} not found`);
      error.status = 404;
      return next(error);
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    next(error);
  }
};

export const createmeal = async (req, res, next) => {
  try {
    const { name, price, category_id, description, image_url } = req.body;
    const [result] = await pool.execute(
      "INSERT INTO meals (name, price, category_id, description, image_url) VALUES (?, ?, ?, ?, ?)",
      [name, price, category_id, description || null, image_url || null],
    );
    return res
      .status(201)
      .json({ id: result.insertId, name, price, category_id, description, image_url });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const customError = new Error(
        `A meal with the name '${req.body.name}' already exists.`,
      );
      customError.status = 409; // 409 Conflict
      return next(customError);
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      const customError = new Error(
        `Category with id ${req.body.category_id} does not exist.`,
      );
      customError.status = 400; // 400 Bad Request
      return next(customError);
    }
    // Any other unexpected database error (e.g. connection lost) -> 500 Internal Server Error
    next(error);
  }
};

export const updatemeal = async (req, res, next) => {
  const id = parseInt(req.params.id);
  const { name, price, category_id, description, image_url } = req.body;
  try {
    const [result] = await pool.execute(
      "UPDATE meals SET name = ?, price = ?, category_id = ?, description = ?, image_url = COALESCE(?, image_url) WHERE id = ?",
      [name, price, category_id, description || null, image_url || null, id],
    );
    if (result.affectedRows === 0) {
      const error = new Error("NOT FOUND");
      error.status = 404;
      return next(error);
    }
    res.status(200).json({ id, name, price, category_id, description, image_url });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const customError = new Error(
        `A meal with the name '${req.body.name}' already exists.`,
      );
      customError.status = 409;
      return next(customError);
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      const customError = new Error(
        `Category with id ${req.body.category_id} does not exist.`,
      );
      customError.status = 400;
      return next(customError);
    }
    next(error);
  }
};

export const deletemeal = async (req, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const [result] = await pool.execute("DELETE FROM meals WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      const error = new Error("Not Found");
      error.status = 404;
      return next(error);
    }
    res
      .status(200)
      .json({ message: `meal with the id ${id} deleted Successfully!` });
  } catch (error) {
    next(error);
  }
};

/*export const getMeal = (req , res,next)=>{
    const id = parseInt(req.params.id);
    const meal = meals.find((meal) => (meal.id === id));

    if(!meal){
        const error = new Error(`Meal with id ${id} not found`);
        error.status = 404;// 👈 Passes it down to errorHandler
        return next(error);
    }
    res.status(200).json(meal);
}*/

// export const createMeal = (req , res) =>{

//     // 1. Extract fields from req.body (using destructuring)
//     const { name , price , category} = req.body;

//     const newMeal = {
//         id : meals.length + 1,
//         name,      // shorthand for name: name
//         price,     // shorthand for price: price
//         category   // shorthand for category: category
//     };

//     meals.push(newMeal);

//     res.status(201).json({newMeal});

// }

// export const updateMeal = (req,res) =>{

//     const id = parseInt(req.params.id);

//     const meal = meals.find((meal) => meal.id ===id );

//     if(!meal){
//         return res.status(404).json({message : `cant find post of id: ${id}` });
//     }
//     const {name , price , category} = req.body;
//     const updatedMeal = {
//         id,
//         name,
//         price,
//         category
//     };
//     // 4. Update the meal (keep old value if new one isn't provided)
//     if (name) meal.name = name;
//     if (price) meal.price = price;
//     if (category) meal.category = category;

//     res.status(200).json(meal);

// }

// export const deleteMeal = (req,res) =>{
//     const id = parseInt(req.params.id);

//     meals = meals.filter((meal)=>meal.id !==id);
//     res.status(200).json(meals);
// }
