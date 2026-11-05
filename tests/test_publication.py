import hashlib
import json
import unittest
from scripts import collect_catalog as c
from tests.test_collect_catalog import ScriptedHTTP, NOW, STAMP, TOKEN, list_ok, snapshot_ok

SCOPE = 'seoul:관악구:education'
def receipt(**fields):
    return {'scope': SCOPE, 'revision': 'a'*20, 'fetchedAt': STAMP, 'publishedAt': STAMP,
            'publicCount': 1, 'idsHash': hashlib.sha256(b'["seoul:S1"]').hexdigest(), **fields}
def catalog(r=None):
    return {'schemaVersion': 2, 'coverageScope': [SCOPE], 'courses': [{'id': 'seoul:S1', 'scopeId': SCOPE}],
            'availableScopes': [{'id': SCOPE, 'publication': r if r is not None else receipt()}]}

class PublicationTests(unittest.TestCase):
    def test_collection_returns_receipt_without_public_requests(self):
        http=ScriptedHTTP([list_ok(), snapshot_ok(publication=receipt())])
        result=c.run_collection(TOKEN, scope_id=SCOPE, defer_verify=True, opener=http, clock=lambda:NOW, sleep=lambda _:None, emit=lambda _:None)
        self.assertEqual(result,receipt())
        self.assertEqual([r.get_method() for r in http.requests],['POST','POST'])

    def test_stale_only_rechecks_public_once_at_eight_minutes(self):
        http=ScriptedHTTP([catalog(receipt(fetchedAt='2026-10-22T20:00:00Z')),catalog()])
        sleeps=[]
        c.verify_publications([receipt()],opener=http,clock=lambda:NOW,sleep=sleeps.append,emit=lambda _:None)
        self.assertEqual(sleeps,[480])
        self.assertEqual([r.get_method() for r in http.requests],['GET','GET'])
        self.assertTrue(all(r.get_header('Authorization') is None for r in http.requests))

    def test_still_stale_fails_with_specific_code(self):
        stale=catalog(receipt(fetchedAt='2026-10-22T20:00:00Z'))
        with self.assertRaises(c.CollectionFailure) as error:
            c.verify_publications([receipt()],opener=ScriptedHTTP([stale,stale]),clock=lambda:NOW,sleep=lambda _:None,emit=lambda _:None)
        self.assertEqual(error.exception.code,'PUBLICATION_NOT_VISIBLE')

    def test_invalid_ids_and_wrong_contents_fail_without_wait(self):
        duplicate=catalog();duplicate['courses']*=2
        wrong=catalog();wrong['courses'][0]['id']='seoul:S2'
        for body,code in [(duplicate,'PUBLIC_CATALOG_INVALID'),(wrong,'PUBLIC_CONTENT_MISMATCH')]:
            sleeps=[]
            with self.assertRaises(c.CollectionFailure) as error:
                c.verify_publications([receipt()],opener=ScriptedHTTP([body]),clock=lambda:NOW,sleep=sleeps.append,emit=lambda _:None)
            self.assertEqual(error.exception.code,code)
            self.assertEqual(sleeps,[])

    def test_empty_verified_scope_is_valid(self):
        r=receipt(publicCount=0,idsHash=hashlib.sha256(b'[]').hexdigest())
        body=catalog(r);body['courses']=[]
        c.verify_publications([r],opener=ScriptedHTTP([body]),clock=lambda:NOW,emit=lambda _:None)
