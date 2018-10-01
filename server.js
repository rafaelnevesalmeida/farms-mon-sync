'use strict'
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { createHttpLink } from "apollo-link-http";
import fetch from "node-fetch";
import gql from "graphql-tag";
require('dotenv').config()

const clientPi = new ApolloClient({
  link: createHttpLink({
    uri: process.env.LOCAL_API_SERVER,
    fetch: fetch,
  }),
  cache: new InMemoryCache(),
});

const clientWeb = new ApolloClient({
  link: createHttpLink({
    uri: process.env.WEB_API_SERVER,
    fetch: fetch,
  }),
  cache: new InMemoryCache(),
});

function sync () {
  const observableQuery = clientPi.watchQuery({ query: gql`{ allWeightsNoSynchronized { id stationId weight date time synchronized }}`, pollInterval: 1000 });

  observableQuery.subscribe({
    next: ({ data }) => {
      if ( data != null ) { 
        data.allWeightsNoSynchronized.map((weight) => {
          clientWeb.mutate({
            mutation: gql`
              mutation AddWeight( $stationId: Int, $weight: Float, $date: String, $time: String, $synchronized: Boolean ) {
                addWeight( stationId: $stationId weight: $weight date: $date time: $time synchronized: $synchronized ) {
                  id stationId weight date time synchronized
                }
              }
            `,
            variables: { stationId: weight.stationId, weight: weight.weight, date: weight.date, time: weight.time, synchronized: false }
          }).then(
            data => {
              if (data.data.addWeight != null ) {
                clientPi.mutate({
                  mutation: gql` mutation SetSynchronized( $id: Int ) { setSynchronized( id: $id ) }`,
                  variables: { id: weight.id }
                }).then(
                  data => { console.log(data) }
                )
              }
            }
          )
        })
      }
    }
  });
}

sync();
