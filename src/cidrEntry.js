export class CidrEntry {
  constructor({ name, cidr, isActive = true }) {
    this.name = name;
    this.cidr = cidr;
    this.isActive = isActive;
  }

  get name() {
    return this.name;
  }

  get cidr() {
    return this.cidr;
  }

  get isActive() {
    return this.isActive;
  }
}
