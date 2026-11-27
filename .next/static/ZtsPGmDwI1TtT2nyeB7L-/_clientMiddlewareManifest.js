self.__MIDDLEWARE_MATCHERS = [
  {
    "missing": [
      {
        "type": "header",
        "key": "next-router-prefetch"
      },
      {
        "type": "header",
        "key": "purpose",
        "value": "prefetch"
      }
    ],
    "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!api|_next|admin\\b|.*\\..*).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$",
    "originalSource": "/((?!api|_next|admin\\b|.*\\..*).*)"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()