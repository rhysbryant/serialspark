#pragma once
#include <map>
#include <string>
#include <stdint.h>
#include "mbedtls/ctr_drbg.h"
#include "Response.h"

using SimpleHTTP::Request;
using SimpleHTTP::Response;

class UserAuthSessionManager
{
private:
    struct cmp_str
    {
        bool operator()(char const *a, char const *b) const
        {
            return strcmp(a, b) < 0;
        }
    };
    static std::map<char *, uint32_t, cmp_str> sessions;
    // session ide time of 30mins
    static const uint32_t sessionMaxIdleTime = 1000 * 60 * 120;

    static mbedtls_ctr_drbg_context ctr_drbg;
    static mbedtls_entropy_context entropy;

public:
    static void initSessionGenerator();
    /**
     * generates a user session token (sha2 hex string) and returns it
     * the pointer will be valid while the session exists
     * @return the session API token
     */
    static char *createSession();

    /**
     * updates the last use time of the token
     * @return false if token does not exist
     */
    static bool updateSessionLastUse(const char *token);

    /**
     * removes any sessions no longer active
     */
    static void removeExpiredSessions();

    /**
     * checks if the token in the request exists and is valid
     * if not will send a response and return false
     */
    static bool checkTokenValid(Request *req, Response *resp);

    static bool checkTokenValid(const char* token);
};