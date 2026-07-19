import fs from 'fs';

const token = JSON.parse(fs.readFileSync(`${process.env.USERPROFILE}/.railway/config.json`, 'utf8')).user.token;
const PROJECT_ID = 'bce85347-5658-4038-987d-7a53d88c8c17';
const ENV_ID = '98325e50-93e2-4f92-8feb-9b29f510c861';
const SERVICE_ID = 'a7c2162b-e7c8-42c5-8363-f32495a379d8';
const CORS_ORIGIN =
  'https://q-emplois.vercel.app,https://q-emplois-d9qo.vercel.app,https://www.quebec-emplois.ca,https://quebec-emplois.ca,https://www.q-emplois.com,https://q-emplois.com,http://localhost:5173';

async function gql(query, variables) {
  const res = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  return json.data;
}

await gql(
  `mutation($input: VariableCollectionUpsertInput!) {
    variableCollectionUpsert(input: $input)
  }`,
  {
    input: {
      projectId: PROJECT_ID,
      environmentId: ENV_ID,
      serviceId: SERVICE_ID,
      variables: {
        CORS_ORIGIN,
        FRONTEND_URL: 'https://www.quebec-emplois.ca',
      },
    },
  },
);
console.log('CORS_ORIGIN and FRONTEND_URL updated');

await gql(
  `mutation {
    serviceInstanceRedeploy(serviceId: "${SERVICE_ID}", environmentId: "${ENV_ID}")
  }`,
);
console.log('Redeploy triggered');