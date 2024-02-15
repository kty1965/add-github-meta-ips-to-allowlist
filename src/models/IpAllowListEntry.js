export class IpAllowListEntry {
  constructor({ name, allowListValue, isActive, createdAt, updatedAt, id }) {
    this._name = name;
    this._allowListValue = allowListValue;
    this._isActive = isActive;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._id = id;
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

  get id() {
    return this._id;
  }

  toDictionary() {
    return {
      name: this._name,
      cidr: this._allowListValue,
      allowListValue: this._allowListValue,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      id: this._id,
    };
  }
}
