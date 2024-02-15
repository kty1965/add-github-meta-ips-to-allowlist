export class Enterprise {
  constructor({ name, databaseId, slug, url, id }) {
    this._databaseId = databaseId;
    this._name = name;
    this._slug = slug;
    this._url = url;
    this._id = id;
  }

  get databaseId() {
    return this._databaseId;
  }
  get name() {
    return this._name;
  }
  get slug() {
    return this._slug;
  }
  get url() {
    return this._url;
  }
  get id() {
    return this._id;
  }
}
