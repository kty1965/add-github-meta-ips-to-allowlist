export class IpAllowListEntry {
  constructor({ name, allowListValue, isActive, createdAt, updatedAt }) {
    this._name = name;
    this._allowListValue = allowListValue;
    this._isActive = isActive;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get name() {
    return this._name;
  }

  get cidr() {
    return this._allowListValue;
  }

  get allowListValue() {
    return this._allowListValue;
  }

  get isActive() {
    return this._isActive;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }
}
