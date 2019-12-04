require('dotenv').config();
const joinMonster = require('join-monster')
const express = require('express')
const graphqlHTTP = require('express-graphql')
const graphql = require('graphql')

// Using knex instead of mysql
// var mysql = require('mysql');

// Enter your databse information
var knex = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE
  },
})

// Testing that the client is connected. UNCOMMENT AND CHANGE THE TABLE TO SEE IF THE CLIENT CONNECTED
// Note that the result is an array where the first item is the query result
// knex.raw('SELECT * FROM user').then(x => console.log(x[0]))



const QueryRoot = new graphql.GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    // Testing if we can query this file - not the database
    hello: {
      type: graphql.GraphQLString,
      resolve: () => "Hello World!"
    },
    // Testing if we can access the 'user' table in the 'testing' database
    // Define a new model below if you're accessing something else
    user: {
      type: new graphql.GraphQLList(User),
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster.default(resolveInfo, context, sql => {
          return knex.raw(sql).then(result => result[0])
        }, { dialect: 'mysql' })
      }
    },
    incidents: {
      type: new graphql.GraphQLList(Incident),
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster.default(resolveInfo, context, sql => {
          return knex.raw(sql).then(result => result[0])
        }, { dialect: 'mysql' })
      }
    },
  })
});

const MutationRoot = new graphql.GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    User: {
      type: User,
      args: {
        age: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) },
        firstName: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
        lastName: { type: graphql.GraphQLNonNull(graphql.GraphQLString) }
      },
      resolve: async (parent, args, context, resolveInfo) => {
        // Generalizing the variables
        let keys = Object.keys(args).toString();
        let values = valueFormat(args);
        let table = User._typeConfig.sqlTable;

        try {
          return (await knex.raw("INSERT INTO " + table + " (" + keys + ") VALUES (" + values + ");"))
        } catch (err) {
          throw new Error("Failed to insert new user: " + err)
        }
      }
    }
  })
})

// Keys and Values need different formatting for the raw SQL
const valueFormat = (args) => {
  let values = Object.values(args)
  let stringArr = values.map(value => {
    return ("'" + value + "'")
  })
  return stringArr.toString()
}

// Defines the model
const User = new graphql.GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: graphql.GraphQLInt },
    age: { 
      type: graphql.GraphQLInt,
      //This is an example of how to define the column name if it doesn't match the field name
      // sqlColumn: 'ageOfUser'
    },
    firstName: { type: graphql.GraphQLString },
    lastName: { type: graphql.GraphQLString }
  })
});

// Not sure why I can't define this in User
User._typeConfig = {
  sqlTable: 'user',
  uniqueKey: 'id'
}

const Incident = new graphql.GraphQLObjectType({
  name: 'Incident',
  fields: () => ({
    id: { type: graphql.GraphQLInt },
    narratives: { type: graphql.GraphQLString }
  })
})

Incident._typeConfig = {
  sqlTable: 'incidents',
  uniqueKey: 'id'
}

const schema = new graphql.GraphQLSchema({
  query: QueryRoot,
  mutation: MutationRoot
});

const app = express();
app.use('/api', graphqlHTTP({
  schema: schema,
  graphiql: true,
}));
app.listen(4000);

