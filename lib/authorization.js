'use strict';
import uuid from 'uuid';
import {
  Event
}
from '@hoist/model';
import {
  filter
}
from 'lodash';
export class Authorisation {
  constructor(request, reply, bouncerToken, publisher) {
    this._request = request;
    this._reply = reply;
    this._bouncerToken = bouncerToken;
    this.query = request.query;
    this.payload = request.payload;
    this.key = bouncerToken.key;
    this._publisher = publisher;
  }
  set(key, value, callback) {
    this._bouncerToken.state[key] = value;
    this._bouncerToken.markModified('state');
    return this._bouncerToken.saveAsync().then(() => {
      return this;
    }).nodeify(callback);
  }
  setDisplayProperty(name, value, callback) {
    var existingProperty = filter(this._bouncerToken.displayProperties, (prop) => {
      return prop.name.toLowerCase() === name.toLowerCase();
    });
    if (existingProperty.length !== 0) {
      existingProperty[0].value = value;
    } else {
      this._bouncerToken.displayProperties.push({
        name: name,
        value: value
      });
    }
    return this._bouncerToken.saveAsync().then(() => {
      return this;
    }).nodeify(callback);
  }
  get(key) {
    return this._bouncerToken.state[key];
  }
  delete(key, callback) {
    delete this._bouncerToken.state[key];
    this._bouncerToken.markModified('state');
    return this._bouncerToken.saveAsync().then(() => {
      return this;
    }).nodeify(callback);
  }
  raise(name, payload) {
    let event = new Event({
      eventId: uuid.v4().split('-').join(''),
      applicationId: this._bouncerToken.application,
      eventName: name,
      environment: 'live',
      correlationId: require('uuid').v4(),
      payload: payload
    });
    return this._publisher.publish(event);
  }
}
