'use strict';
module.exports = (config = {}) => {
  const _ = config._ || require('lodash/fp');
  const deepDiff = config.deepDiff || require('deep-diff');
  const awsGateway = config.awsGateway || require('./../services/awsGateway')();
  const ecsGateway = config.ecsGateway || require('./../services/ecsGateway')();
  const backup = config.backup || _.get('0.action', require('./backup')());

  function updateContainers(names, tag, containers) {
    return _.map(definition => {
      if (!names.includes(definition.name)) {
        return definition;
      }
      return _.assign(definition, {
        image: [_.head(definition.image.split(':')), tag].join(':'),
        environment: _.map(({name, value}) => {
          return {
            name,
            value: name === 'APP_VERSION' ? tag : value
          }
        }, definition.environment)
      })
    }, containers);
  }

  function buildNewTask(project, tag, oldTask) {
    oldTask = _.pick(['family', 'containerDefinitions'], oldTask);
    const newTask = _.assign(oldTask, {
      containerDefinitions: updateContainers([oldTask.family, 'web', project], tag, oldTask.containerDefinitions)
    });
    return deepDiff(newTask, oldTask) ? newTask : false;
  }

  return [{
    command: 'deploy <project> <environment> <tag>',
    description: 'Deploy project',
    options: [
      ['-b, --backup [1/0]', 'Backup the DB', 1],
      ['-c, --count [n]', 'Desired number of tasks', 1]
    ],
    action: (project, environment, tag, command) => {
      return command.backup == 1 ? backup(project, environment) : new Promise(resolve => resolve())
        .then(() => awsGateway.describeService(`${project}-${environment}`))
        .then(({service, taskDefinition}) => {
          let definition = buildNewTask(project, tag, taskDefinition);
          return (definition
            ? ecsGateway.registerTaskDefinition(definition)
            : new Promise(resolve => resolve(taskDefinition)))
            .then(({taskDefinitionArn}) => {
              return ecsGateway.updateService(service.serviceArn, service.clusterArn, command.count, taskDefinitionArn)
            });
        })
        .then(({serviceName}) => `Deploying ${serviceName}.`);
    }
  }];
};
