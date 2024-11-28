from sqlalchemy.types import UserDefinedType

class VectorType(UserDefinedType):
    def get_col_spec(self):
        return "VECTOR"

    def bind_expression(self, bindvalue):
        return bindvalue

    def column_expression(self, col):
        return col
