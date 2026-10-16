export const authorize = (...allowedRoles) =>{ //... allowed roles means that we can pass as much as we want as arguments and they are combined in an array
    return (req,res,next)=>{ //this return is essential in this case since in the router the ft is return with params so this is needed so the ft can access req,res and next
        if(!req.user|| !allowedRoles.includes(req.user.role)){
            const error= new Error("Access Forbidden.You do not have permission");
            error.status = 403;
            return next(error);
        }
        next();
    }
}