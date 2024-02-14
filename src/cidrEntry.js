export class CidrEntry {
  constructor({ name, cidr, isActive = true }) {
    this._name = name;
    this._cidr = cidr;
    this._isActive = isActive;
  }

  get name() {
    return this._name;
  }

  get cidr() {
    return this._cidr;
  }

  get isActive() {
    return this._isActive;
  }
}
