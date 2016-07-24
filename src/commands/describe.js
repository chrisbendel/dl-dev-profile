'use strict';
module.exports = (config = {}) => {
  const _ = config._ || require('lodash/fp');
  const awsGateway = config.awsGateway || require('./../services/awsGateway')();

  return [{
    command: 'describe [project] [environment]',
    description: 'Describe currently deployed project.',
    action: (project, environment) => awsGateway
      .describeService(`${project}-${environment}`)
      .then(({service, tasks, taskDefinition, nodes}) => {
        return JSON.stringify({
          service: {
            deployments: _.map(
              _.pick(['desiredCount', 'runningCount', 'pendingCount', 'createdAt']),
              service.deployments
            )
          },
          tasks: tasks.length,
          taskDefinition: {
            revision: taskDefinition.revision,
            containers: _.map(_.pick(['name', 'image']), taskDefinition.containerDefinitions)
          },
          nodes: _.map(_.pick(['PublicIpAddress']), nodes)
        }, null, 2);
      })
  }];
};
