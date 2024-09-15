
const dotenv=require('dotenv')
dotenv.config({path:'backend/config/config.env'})
const app=require('./app')
const connectDatabase=require('./config/database')

//Handling uncought Exception
process.on('uncaughtException',err=>{

console.log(`Error: ${err.message}`);
console.log(`Shutting down the server due to uncought Exception`);
process.exit(1)
})






connectDatabase()


const server=app.listen(process.env.PORT,()=>{


console.log(`Server is listening on http://localhost:${process.env.PORT}`);


})

//unhandled promise rejection 
process.on('unhandledRejection',err=>{
console.log(`Error: ${err.message}`);
console.log(`Shutting down the server due to unhandled promise rejection`);
server.close(()=>{
process.exit(1)


})

})
  
