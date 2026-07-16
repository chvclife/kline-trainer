# server/tests/test_auth.py
import pytest
from fastapi import status


class TestAuth:

    # ── Register ──────────────────────────────────────────────

    def test_register_success(self, client):
        payload = {"username": "newuser", "password": "secret123"}
        response = client.post("/api/auth/register", json=payload)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_register_duplicate_username(self, client):
        payload = {"username": "dupe", "password": "secret123"}
        # First registration succeeds
        response1 = client.post("/api/auth/register", json=payload)
        assert response1.status_code == status.HTTP_201_CREATED

        # Second registration with same username fails
        response2 = client.post("/api/auth/register", json=payload)
        assert response2.status_code == status.HTTP_409_CONFLICT
        assert response2.json()["detail"] == "Username already taken"

    def test_register_short_username(self, client):
        payload = {"username": "ab", "password": "secret123"}
        response = client.post("/api/auth/register", json=payload)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_short_password(self, client):
        payload = {"username": "validuser", "password": "12345"}
        response = client.post("/api/auth/register", json=payload)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # ── Login ─────────────────────────────────────────────────

    def test_login_success(self, client):
        # Register a user first
        payload = {"username": "loginuser", "password": "secret123"}
        register_resp = client.post("/api/auth/register", json=payload)
        assert register_resp.status_code == status.HTTP_201_CREATED

        # Now log in
        login_resp = client.post("/api/auth/login", json=payload)
        assert login_resp.status_code == status.HTTP_200_OK
        data = login_resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client):
        # Register a user
        payload = {"username": "wrongpw", "password": "secret123"}
        register_resp = client.post("/api/auth/register", json=payload)
        assert register_resp.status_code == status.HTTP_201_CREATED

        # Try login with wrong password
        login_resp = client.post(
            "/api/auth/login",
            json={"username": "wrongpw", "password": "wrongpass"},
        )
        assert login_resp.status_code == status.HTTP_401_UNAUTHORIZED
        assert login_resp.json()["detail"] == "Invalid username or password"

    # ── Get Me ────────────────────────────────────────────────

    def test_get_me_with_token(self, client):
        # Register and get token
        payload = {"username": "meuser", "password": "secret123"}
        register_resp = client.post("/api/auth/register", json=payload)
        assert register_resp.status_code == status.HTTP_201_CREATED
        token = register_resp.json()["access_token"]

        # Call /me with the token
        me_resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == status.HTTP_200_OK
        data = me_resp.json()
        assert data["username"] == "meuser"
        assert "id" in data
        assert "created_at" in data

    def test_get_me_without_token(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED