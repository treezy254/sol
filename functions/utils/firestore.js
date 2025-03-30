const admin = require("firebase-admin");

// Check if Firebase has already been initialized
if (!admin.apps.length) {
  const serviceAccount = require("./serviceAccount.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

class FirestoreRepository {
  static async write(collection, data) {
    const collectionRef = db.collection(collection);
    const batch = db.batch();
    const documents = Array.isArray(data) ? data : [data];
    const documentTagsSeen = new Set();

    for (const document of documents) {
      const documentTag = document.document_tag;
      const contents = document.contents;

      if (!documentTag || !contents) {
        throw new Error("Each document must have 'document_tag' and 'contents'.");
      }

      if (documentTagsSeen.has(documentTag)) {
        throw new Error(`Duplicate document tag '${documentTag}'`);
      }

      documentTagsSeen.add(documentTag);
      const docRef = collectionRef.doc(documentTag);
      const doc = await docRef.get();

      if (doc.exists) {
        throw new Error(`Document '${documentTag}' already exists`);
      }

      batch.set(docRef, contents);
    }

    await batch.commit();
    return true;
  }

  static async read(collection, identifier = null, filters = []) {
    const collectionRef = db.collection(collection);

    if (identifier) {
      const doc = await collectionRef.doc(identifier).get();
      return doc.exists ? [doc.data()] : [];
    }

    let query = collectionRef;
    for (const {field, operator, value} of filters) {
      query = query.where(field, operator, value);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data());
  }

  static async update(collection, identifier, updates) {
    const docRef = db.collection(collection).doc(identifier);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error(`Document '${identifier}' does not exist`);
    }

    await docRef.update(updates);
    return true;
  }
}

module.exports = FirestoreRepository;

